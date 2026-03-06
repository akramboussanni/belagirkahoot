import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Check, X } from "lucide-react";

import { LeaderboardDisplay } from "../components/LeaderboardDisplay";
import { PodiumScreen } from "../components/PodiumScreen";
import { useWebSocket } from "../hooks/useWebSocket";
import { getPlayerResults } from "../api/sessions";
import type { WsMessage, QuestionPayload, LeaderboardEntry, PodiumEntry } from "../types";
import { GameBackground } from "../components/GameBackground";
import { GameCard } from "../components/GameCard";
import { GameBrand } from "../components/GameBrand";
import { GameHeader } from "../components/GameHeader";

const WS_BASE = import.meta.env.VITE_WS_BASE_URL ?? "ws://localhost:8081";

// Answer option colors matching the Figma design
const OPTION_COLORS = ["#4caf50", "#2196f3", "#ff6b35", "#f44336"];

interface RevealScore {
  is_correct: boolean;
  points: number;
  total_score: number;
}

interface AnswerRevealPayload {
  correct_option_id: string;
  scores: Record<string, RevealScore>;
}

type GamePhase = "waiting" | "question" | "reveal" | "leaderboard" | "podium" | "ended";

function CountdownRing({ timeLimit, startedAt }: { timeLimit: number; startedAt: number }) {
  const [remaining, setRemaining] = useState(timeLimit);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const left = Math.max(0, timeLimit - elapsed);
      setRemaining(left);
      if (left <= 0 && intervalRef.current) clearInterval(intervalRef.current);
    }, 100);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [timeLimit, startedAt]);

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = remaining / timeLimit;
  const strokeDashoffset = circumference * (1 - progress);
  const isUrgent = remaining <= 5;
  const color = isUrgent ? "#f44336" : "#0136fe";

  return (
    <div className="relative flex items-center justify-center w-24 h-24 bg-white rounded-full shadow-inner border-4 border-slate-50">
      <svg className="absolute inset-0 -rotate-90" width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="rgba(1,54,254,0.05)" strokeWidth="6" />
        <circle cx="48" cy="48" r={radius} fill="none" stroke={color} strokeWidth="6"
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          style={{ transition: "stroke-dashoffset 0.1s linear, stroke 0.3s" }} />
      </svg>
      <span className="text-3xl font-black tabular-nums" style={{ color }}>
        {Math.ceil(remaining)}
      </span>
    </div>
  );
}

export function PlayerGamePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const playerId = sessionStorage.getItem("player_id") ?? "";
  const sessionId = sessionStorage.getItem("session_id") ?? "";
  const playerName = sessionStorage.getItem("player_name") ?? "";

  const [phase, setPhase] = useState<GamePhase>("waiting");
  const [currentQuestion, setCurrentQuestion] = useState<QuestionPayload | null>(null);
  const [questionStartedAt, setQuestionStartedAt] = useState<number>(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [revealPayload, setRevealPayload] = useState<AnswerRevealPayload | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [prevLeaderboard, setPrevLeaderboard] = useState<LeaderboardEntry[]>([]);
  const leaderboardRef = useRef<LeaderboardEntry[]>([]);
  const [podium, setPodium] = useState<PodiumEntry[]>([]);

  const { data: playerResults } = useQuery({
    queryKey: ["playerResults", sessionId, playerId],
    queryFn: () => getPlayerResults(sessionId, playerId),
    enabled: phase === "podium" && !!sessionId && !!playerId,
    staleTime: Infinity,
  });

  const { send } = useWebSocket({
    url: `${WS_BASE}/api/v1/ws/player/${code}?player_id=${playerId}&name=${encodeURIComponent(playerName)}`,
    onMessage: useCallback((msg: WsMessage) => {
      switch (msg.type) {
        case "question": {
          const p = msg.payload as QuestionPayload;
          setCurrentQuestion(p);
          setPhase("question");
          setSelectedOptionId(null);
          setRevealPayload(null);
          setQuestionStartedAt(Date.now());
          break;
        }
        case "answer_reveal": {
          const p = msg.payload as AnswerRevealPayload;
          setRevealPayload(p);
          setPhase("reveal");
          break;
        }
        case "leaderboard": {
          const p = msg.payload as { entries: LeaderboardEntry[] };
          setPrevLeaderboard(leaderboardRef.current);
          leaderboardRef.current = p.entries;
          setLeaderboard(p.entries);
          setPhase("leaderboard");
          break;
        }
        case "podium": {
          const p = msg.payload as { entries: PodiumEntry[] };
          setPodium(p.entries);
          setPhase("podium");
          break;
        }
        case "game_over": {
          const p = msg.payload as { reason?: string };
          if (p.reason === "session_ended") setPhase("ended");
          break;
        }
      }
    }, []),
    enabled: !!code && !!playerId,
  });

  const handleSelectOption = (optionId: string, questionId: string) => {
    if (selectedOptionId) return;
    setSelectedOptionId(optionId);
    send({ type: "answer_submitted", payload: { question_id: questionId, option_id: optionId } });
  };

  const wrapContent = (content: React.ReactNode) => (
    <GameBackground>
      <div className="flex flex-col min-h-screen">
        <GameHeader code={code!} onExit={() => navigate("/join")} />
        <div className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-md mx-auto">
          {content}
        </div>
      </div>
    </GameBackground>
  );

  if (phase === "ended") {
    return wrapContent(
      <GameCard className="text-center w-full">
        <h1 className="text-4xl font-black text-[#0136fe] mb-4 uppercase tracking-tight">Fin du jeu</h1>
        <p className="mb-8 font-medium" style={{ color: "rgba(1,54,254,0.6)" }}>L'hôte a terminé la session.</p>
        <button
          onClick={() => navigate("/join")}
          className="w-full py-4 rounded-2xl font-black text-white shadow-xl uppercase tracking-widest transition-all"
          style={{ background: "#ff6b35" }}
        >
          Retour à l'accueil
        </button>
      </GameCard>
    );
  }

  if (phase === "waiting") {
    return wrapContent(
      <div className="flex flex-col items-center">
        <GameBrand />
        <p className="mt-8 font-black text-2xl uppercase tracking-[0.2em] animate-pulse" style={{ color: "#0136fe" }}>Préparez-vous…</p>
        <div className="flex gap-2 mt-6">
          {[0, 1, 2].map(i => (
            <motion.div key={i} className="w-3 h-3 rounded-full" style={{ background: "#0136fe" }}
              animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
          ))}
        </div>
      </div>
    );
  }

  if (phase === "podium") {
    return <PodiumScreen entries={podium} playerId={playerId} playerResults={playerResults} />;
  }

  if (phase === "leaderboard") {
    return wrapContent(
      <div className="w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-black uppercase tracking-tight mb-2" style={{ color: "#0136fe" }}>Classement</h2>
          <p className="text-xs font-black uppercase tracking-widest opacity-40" style={{ color: "#0136fe" }}>En attente de l'hôte…</p>
        </div>
        <LeaderboardDisplay entries={leaderboard} prevEntries={prevLeaderboard} highlightPlayerId={playerId} />
      </div>
    );
  }

  if (phase === "reveal" && currentQuestion && revealPayload) {
    const myScore = revealPayload.scores[playerId];
    const isCorrect = myScore?.is_correct ?? false;
    const points = myScore?.points ?? 0;
    const opts = currentQuestion.question.options;

    return wrapContent(
      <div className="w-full space-y-8">
        <GameCard className="text-center">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className={`inline-block px-12 py-6 rounded-3xl mb-6 shadow-xl ${isCorrect ? "bg-[#b7f700]" : "bg-red-500"}`}
          >
            <p className="text-sm font-black uppercase tracking-widest mb-1" style={{ color: isCorrect ? "#0136fe" : "#ffffff" }}>
              {isCorrect ? "Bravo !" : "Oups..."}
            </p>
            <h2 className="text-5xl font-black" style={{ color: isCorrect ? "#0136fe" : "#ffffff" }}>
              {isCorrect ? `+${points}` : "0"}
            </h2>
          </motion.div>
          <p className="font-bold text-lg" style={{ color: "#0136fe" }}>
            {isCorrect ? "Votre réponse est correcte !" : "Ce n'est pas la bonne réponse."}
          </p>
        </GameCard>

        <div className="space-y-3">
          {opts.map((opt, i) => {
            const isCorrectOpt = opt.id === revealPayload.correct_option_id;
            const wasSelected = opt.id === selectedOptionId;
            const color = OPTION_COLORS[i % 4];
            return (
              <div key={opt.id} className={`rounded-2xl p-4 flex items-center gap-4 border-4 transition-all ${isCorrectOpt ? "bg-white border-[#b7f700] shadow-lg scale-105" :
                wasSelected ? "bg-red-50 border-red-500 opacity-60" :
                  "bg-white/50 border-transparent opacity-30"
                }`}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white" style={{ background: color }}>
                  {String.fromCharCode(65 + i)}
                </div>
                <p className="font-bold flex-1" style={{ color: "#0136fe" }}>{opt.text}</p>
                {isCorrectOpt && <Check className="w-6 h-6 text-[#b7f700]" strokeWidth={4} />}
                {!isCorrectOpt && wasSelected && <X className="w-6 h-6 text-red-500" strokeWidth={4} />}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (phase === "question" && currentQuestion) {
    const opts = currentQuestion.question.options;

    return wrapContent(
      <div className="w-full space-y-6">
        <div className="flex justify-center -mt-12 mb-8">
          <CountdownRing timeLimit={currentQuestion.question.time_limit} startedAt={questionStartedAt} />
        </div>

        <GameCard>
          <div className="flex items-center gap-2 mb-4 opacity-40">
            <span className="font-black text-[10px] uppercase tracking-widest" style={{ color: "#0136fe" }}>Question {currentQuestion.question_index + 1}/{currentQuestion.total_questions}</span>
          </div>
          <h2 className="text-2xl font-black leading-tight" style={{ color: "#0136fe" }}>{currentQuestion.question.text}</h2>
        </GameCard>

        {selectedOptionId ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center pt-8">
            <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mx-auto mb-4 shadow-xl border-8 border-[#b7f700]">
              <Check className="w-10 h-10" style={{ color: "#0136fe" }} strokeWidth={4} />
            </div>
            <p className="text-xl font-black uppercase tracking-tight mb-2" style={{ color: "#0136fe" }}>Réponse verrouillée !</p>
            <p className="text-sm font-medium opacity-60" style={{ color: "#0136fe" }}>En attente des autres génies...</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {opts.map((opt, i) => (
              <motion.button
                key={opt.id}
                onClick={() => handleSelectOption(opt.id, currentQuestion.question.id)}
                className="w-full p-6 rounded-[2rem] flex items-center gap-6 shadow-lg transition-all group relative overflow-hidden"
                style={{ background: OPTION_COLORS[i % 4] }}
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center font-black text-2xl text-white group-hover:scale-110 transition-transform">
                  {String.fromCharCode(65 + i)}
                </div>
                <span className="font-black text-xl text-white text-left leading-tight py-2">{opt.text}</span>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}
