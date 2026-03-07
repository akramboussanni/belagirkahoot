import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ChevronRight, Check } from "lucide-react";
import toast from "react-hot-toast";

import { useWebSocket } from "../hooks/useWebSocket";
import { useGameStore } from "../stores/gameStore";
import { endSession } from "../api/sessions";
import { LeaderboardDisplay } from "../components/LeaderboardDisplay";
import { PodiumScreen } from "../components/PodiumScreen";
import { ConfirmModal } from "../components/ConfirmModal";
import type { WsMessage, LeaderboardEntry, PodiumEntry } from "../types";
import { GameBackground } from "../components/GameBackground";
import { GameHeader } from "../components/GameHeader";
import { GameCard } from "../components/GameCard";
import { GameBrand } from "../components/GameBrand";

const WS_BASE = import.meta.env.VITE_WS_BASE_URL ?? "ws://localhost:8081";

interface HostOption {
  id: string;
  text: string;
  is_correct: boolean;
}

interface HostQuestionPayload {
  question_index: number;
  total_questions: number;
  question: {
    id: string;
    text: string;
    time_limit: number;
    options: HostOption[];
  };
}

interface AnswerRevealPayload {
  correct_option_id: string;
  scores: Record<string, { is_correct: boolean; points: number; total_score: number }>;
}

type GamePhase = "waiting" | "question" | "reveal" | "leaderboard" | "podium";

const OPTION_COLORS = ["#4caf50", "#2196f3", "#ff6b35", "#f44336"];
const OPTION_LETTERS = ["A", "B", "C", "D"];

export function HostGamePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const activeSession = useGameStore((s) => s.activeSession);
  const clearActiveSession = useGameStore((s) => s.clearActiveSession);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const [phase, setPhase] = useState<GamePhase>("waiting");
  const [currentQuestion, setCurrentQuestion] = useState<HostQuestionPayload | null>(null);
  const [revealPayload, setRevealPayload] = useState<AnswerRevealPayload | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [prevLeaderboard, setPrevLeaderboard] = useState<LeaderboardEntry[]>([]);
  const leaderboardRef = useRef<LeaderboardEntry[]>([]);
  const [podium, setPodium] = useState<PodiumEntry[]>([]);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [wsReady, setWsReady] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timeLimit, setTimeLimit] = useState(20);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  useEffect(() => {
    if (phase !== "question" || timeLeft <= 0) return;
    const id = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [phase, timeLeft]);

  const { send } = useWebSocket({
    url: `${WS_BASE}/api/v1/ws/host/${code}`,
    onOpen: () => setWsReady(true),
    onClose: (event) => {
      setWsReady(false);
      if (event && event.code && event.code !== 1000 && event.code !== 1001) {
          toast.error("Session invalide ou terminée");
          navigate("/host");
      }
    },
    onMessage: useCallback((msg: WsMessage) => {
      switch (msg.type) {
        case "question": {
          const p = msg.payload as HostQuestionPayload;
          setCurrentQuestion(p);
          setPhase("question");
          setAnsweredCount(0);
          setRevealPayload(null);
          setTimeLimit(p.question.time_limit);
          setTimeLeft(p.question.time_limit);
          break;
        }
        case "answer_count": {
          const p = msg.payload as { answered: number; total: number };
          setAnsweredCount(p.answered);
          setTotalPlayers(p.total);
          break;
        }
        case "answer_reveal": {
          const p = msg.payload as AnswerRevealPayload;
          setRevealPayload(p);
          setPhase("reveal");
          setTimeLeft(0);
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
          clearActiveSession();
          break;
        }
      }
    }, [clearActiveSession]),
    enabled: !!code,
  });

  const handleNextQuestion = () => send({ type: "next_question", payload: {} });
  const handleEndGame = () => navigate("/host");

  async function handleForceEndGame() {
    if (activeSession) {
      try { await endSession(activeSession.sessionId); } catch { /* ignore */ }
      clearActiveSession();
    }
    navigate("/host", { replace: true });
  }

  const wrapContent = (content: React.ReactNode, hideHeaderInfo?: boolean) => (
    <GameBackground>
      <div className="flex flex-col min-h-screen">
        <GameHeader
          code={code!}
          onExit={() => setShowEndConfirm(true)}
          gameTitle="Présentation"
          answeredCount={hideHeaderInfo ? undefined : answeredCount}
          totalPlayers={hideHeaderInfo ? undefined : totalPlayers}
        />
        <div className="flex-1 flex flex-col p-6 w-full max-w-4xl mx-auto">
          {content}
        </div>
      </div>
      {showEndConfirm && (
        <ConfirmModal
          title="Terminer le jeu ?"
          message="Cela mettra fin à la session pour tous les joueurs. Cette action est irréversible."
          confirmLabel="Quitter le jeu"
          onConfirm={handleForceEndGame}
          onCancel={() => setShowEndConfirm(false)}
        />
      )}
    </GameBackground>
  );

  if (phase === "waiting") {
    return wrapContent(
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]">
        <GameBrand />
        <p className="mt-8 font-black text-2xl uppercase tracking-[0.2em] animate-pulse text-center" style={{ color: "#0136fe" }}>Démarrage en cours…</p>
        <div className="flex items-center justify-center gap-3 mt-4">
          <span className={`w-3 h-3 rounded-full ${wsReady ? "bg-green-400" : "bg-yellow-400"} shadow-lg`} />
          <p className="text-sm font-bold uppercase tracking-widest" style={{ color: wsReady ? "#4caf50" : "#0136fe" }}>
            {wsReady ? "Connecté" : "Connexion…"}
          </p>
        </div>
      </div>,
      true
    );
  }

  if (phase === "podium") {
    return <PodiumScreen entries={podium.slice(0, 3)} onEnd={handleEndGame} endLabel="Retour au tableau de bord" />;
  }



  if (phase === "leaderboard") {
    const isLastQuestion = !currentQuestion || currentQuestion.question_index + 1 >= currentQuestion.total_questions;
    return wrapContent(
      <div className="flex flex-col items-center justify-center flex-1">
        <div className="w-full max-w-2xl space-y-8">
          <h2 className="text-4xl font-black text-center uppercase tracking-tight" style={{ color: "#0136fe" }}>
            Classement Actuel
          </h2>
          <LeaderboardDisplay entries={leaderboard} prevEntries={prevLeaderboard} maxEntries={5} />
          <motion.button
            onClick={handleNextQuestion}
            className="w-full py-5 rounded-2xl font-black text-xl text-white flex items-center justify-center gap-2 shadow-xl hover:shadow-2xl transition-all uppercase tracking-widest"
            style={{ background: "#0136fe" }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            {isLastQuestion ? "Voir le podium final" : "Question Suivante"}
            <ChevronRight className="w-6 h-6" strokeWidth={3} />
          </motion.button>
        </div>
      </div>,
      true
    );
  }

  const circumference = 2 * Math.PI * 54;
  const dashOffset = circumference * (1 - timeLeft / Math.max(timeLimit, 1));
  const isUrgent = timeLeft <= 5 && timeLeft > 0;

  return wrapContent(
    currentQuestion && (
      <div className="flex flex-col gap-6 flex-1 w-full justify-center">
        {/* Progress Bar */}
        <div className="w-full h-2 rounded-full overflow-hidden bg-white/50 border border-slate-200">
          <motion.div className="h-full rounded-full"
            style={{ background: "#0136fe" }}
            initial={{ width: 0 }}
            animate={{ width: `${((currentQuestion.question_index + 1) / currentQuestion.total_questions) * 100}%` }}
            transition={{ duration: 0.5 }} />
        </div>

        {/* Question Card */}
        <GameCard className="flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <span className="font-black text-sm uppercase tracking-widest px-3 py-1 rounded bg-[#b7f700] text-[#0136fe]">
              Q{currentQuestion.question_index + 1}
            </span>
            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-widest opacity-40 text-[#0136fe]">
              {currentQuestion.question_index + 1}/{currentQuestion.total_questions}
            </div>
          </div>

          <h2 className="text-4xl sm:text-5xl font-black text-[#0136fe] leading-tight text-center px-4">
            {currentQuestion.question.text}
          </h2>

          <div className="flex justify-center mt-12 mb-4">
            <div className="relative w-32 h-32 flex items-center justify-center bg-white rounded-full shadow-inner border-[6px] border-slate-50">
              <svg className="absolute inset-0 w-full h-full" style={{ transform: "rotate(-90deg)" }} viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" stroke="transparent" strokeWidth="8" fill="none" />
                <circle cx="60" cy="60" r="54"
                  stroke={isUrgent ? "#f44336" : "#0136fe"}
                  strokeWidth="8" fill="none" strokeLinecap="round"
                  style={{
                    strokeDasharray: circumference,
                    strokeDashoffset: dashOffset,
                    transition: "stroke-dashoffset 1s linear, stroke 0.3s ease",
                  }} />
              </svg>
              <motion.div className="absolute inset-0 flex items-center justify-center text-5xl font-black"
                style={{ color: isUrgent ? "#f44336" : "#0136fe" }}
                animate={isUrgent ? { scale: [1, 1.15, 1] } : {}}
                transition={{ duration: 0.5, repeat: Infinity }}>
                {timeLeft}
              </motion.div>
            </div>
          </div>
        </GameCard>

        {/* Status/Reveal Area */}
        <div className="w-full mt-4 flex-1">
          {/* Answer Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
            {currentQuestion.question.options.map((opt, i) => {
              const color = OPTION_COLORS[i % 4];
              const isCorrect = opt.is_correct;
              const revealed = phase === "reveal";
              const dimmed = revealed && !isCorrect;

              return (
                <motion.div key={opt.id}
                  className="flex items-center gap-4 px-6 py-5 rounded-[2rem] shadow-sm relative overflow-hidden transition-all"
                  style={{
                    background: revealed ? (isCorrect ? "#b7f700" : "white") : color,
                    border: `4px solid ${revealed ? (isCorrect ? "#b7f700" : "white") : color}`,
                    opacity: dimmed ? 0.5 : 1,
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: dimmed ? 0.5 : 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}>

                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-2xl shrink-0 ${revealed ? (isCorrect ? "bg-[#0136fe] text-white" : "bg-slate-100 text-slate-400") : "bg-white/20 text-white"}`}>
                    {OPTION_LETTERS[i]}
                  </div>

                  <span className={`font-black text-xl flex-1 leading-snug ${revealed ? (isCorrect ? "text-[#0136fe]" : "text-slate-400") : "text-white"}`}>
                    {opt.text}
                  </span>

                  {revealed && isCorrect && (
                    <motion.div
                      className="absolute right-6 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg"
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 300, delay: 0.2 }}>
                      <Check className="w-6 h-6 text-[#0136fe]" strokeWidth={4} />
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Answer Stats Bottom area if revealed */}
        {phase === "reveal" && revealPayload && (
          <GameCard className="flex items-center justify-between !py-4" animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 20 }}>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#b7f700] flex items-center justify-center">
                <span className="text-3xl font-black text-[#0136fe]">
                  {Object.values(revealPayload.scores).filter((s) => s.is_correct).length}
                </span>
              </div>
              <div>
                <p className="font-black text-xl text-[#0136fe] uppercase tracking-wide">Réponses correctes</p>
                <p className="font-bold opacity-50 text-[#0136fe]">sur {Object.keys(revealPayload.scores).length} joueurs</p>
              </div>
            </div>

            <motion.button
              onClick={handleNextQuestion}
              className="px-8 py-4 rounded-2xl font-black text-white flex items-center gap-2 uppercase tracking-widest hover:scale-105 transition-transform"
              style={{ background: "#0136fe" }}>
              Suite <ChevronRight className="w-5 h-5" strokeWidth={3} />
            </motion.button>
          </GameCard>
        )}
      </div>
    )
  );
}
