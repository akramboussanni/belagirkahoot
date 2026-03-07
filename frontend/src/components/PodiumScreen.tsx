import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Trophy, Sparkles } from "lucide-react";

import type { PodiumEntry, PlayerResults } from "../types";

interface Props {
  entries: PodiumEntry[];
  playerId?: string;
  onEnd?: () => void;
  endLabel?: string;
  playerResults?: PlayerResults | null;
}

// Deterministic confetti (stable across renders)
const CONFETTI_COLORS = ["#0136fe", "#ff6b35", "#4caf50", "#2196f3", "#f44336", "#9c27b0", "#ec4899"];

interface ConfettiPiece {
  id: number; color: string; left: string; delay: string; duration: string; width: string; height: string;
}

function generateConfetti(count: number): ConfettiPiece[] {
  let seed = 42;
  const rng = () => { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return ((seed >>> 0) / 0xffffffff) % 1; };
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[Math.floor(rng() * CONFETTI_COLORS.length)],
    left: `${rng() * 100}%`,
    delay: `${rng() * 3}s`,
    duration: `${2.5 + rng() * 2}s`,
    width: `${6 + Math.floor(rng() * 8)}px`,
    height: `${10 + Math.floor(rng() * 8)}px`,
  }));
}

const RANK_MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
const RANK_TESTIDS: Record<number, string> = { 1: "podium-slot-1st", 2: "podium-slot-2nd", 3: "podium-slot-3rd" };
const RANK_COLORS: Record<number, string> = { 1: "#FFD700", 2: "#C0C0C0", 3: "#CD7F32" }; // Gold, Silver, Bronze
const RANK_BG_COLORS: Record<number, string> = { 1: "rgba(255,215,0,0.2)", 2: "rgba(192,192,192,0.2)", 3: "rgba(205,127,50,0.2)" };

function PodiumBlock({
  entry, rank, height, isSelf, delay,
}: { entry: PodiumEntry; rank: number; height: number; isSelf: boolean; delay: number }) {
  const borderColor = RANK_COLORS[rank];
  const bgColor = RANK_BG_COLORS[rank];

  return (
    <motion.div
      className="flex flex-col items-center"
      data-testid={RANK_TESTIDS[rank]}
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay, type: "spring", stiffness: 100 }}
    >
      {/* Medal instead of avatar */}
      <motion.div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-3 bg-white shadow-xl border-4"
        style={{ borderColor, fontSize: "2.5rem" }}
        animate={rank === 1 ? { y: [0, -10, 0] } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        {RANK_MEDALS[rank]}
      </motion.div>

      {/* Podium block */}
      <div
        className={`${rank === 1 ? "w-36" : "w-32"} rounded-t-2xl px-3 py-4 text-center relative overflow-hidden`}
        style={{ height: `${height}px`, background: bgColor, border: `3px solid ${borderColor}`, borderBottom: "none" }}
      >
        {rank === 1 && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent"
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            style={{ opacity: 0.3 }}
          />
        )}
        <p className="font-bold text-sm truncate mb-1" style={{ color: "#0136fe" }}>{entry.name}{isSelf ? " (vous)" : ""}</p>
        <p className={`font-black ${rank === 1 ? "text-3xl" : "text-2xl"}`} style={{ color: borderColor, textShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>{entry.score}</p>
        <p className="text-xs mt-1 font-bold" style={{ color: borderColor }}>
          {rank === 1 ? "CHAMPION !" : rank === 2 ? "2ème Place" : "3ème Place"}
        </p>
      </div>
    </motion.div>
  );
}

export function PodiumScreen({ entries, playerId, onEnd, endLabel = "Retour au tableau de bord", playerResults }: Props) {
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);
  const confetti = useMemo(() => generateConfetti(30), []);
  const myEntry = entries.find((e) => e.player_id === playerId);
  const isChampion = myEntry?.rank === 1;
  const [showBreakdown, setShowBreakdown] = useState(false);

  return (
    <div className="min-h-screen w-full relative overflow-y-auto overflow-x-hidden" style={{ background: "#b7f700" }}>
      {/* Confetti */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden z-20">
        {confetti.map((piece) => (
          <div key={piece.id} className="absolute top-0 animate-confetti-fall"
            style={{ left: piece.left, animationDelay: piece.delay, animationDuration: piece.duration, width: piece.width, height: piece.height }}>
            <div className="w-full h-full animate-confetti-spin" style={{ backgroundColor: piece.color, animationDelay: piece.delay }} />
          </div>
        ))}
      </div>

      <div className="fun-pattern fixed inset-0 z-0" />

      <div className="relative z-10 min-h-screen p-6 max-w-6xl mx-auto flex flex-col pt-12">
        {/* Header - White background */}
        <motion.div 
          className="text-center mb-12 p-8 rounded-3xl bg-white shadow-2xl mx-auto max-w-2xl border-4 border-white"
          initial={{ opacity: 0, y: -30 }} 
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.div className="flex items-center justify-center gap-3 mb-4"
            animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
            <Sparkles className="w-8 h-8 text-[#0136fe]" />
            <Trophy className="w-12 h-12 text-[#0136fe]" />
            <Sparkles className="w-8 h-8 text-[#0136fe]" />
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-black text-[#0136fe] uppercase tracking-tight">
            Partie terminée !
          </h1>
        </motion.div>

        {/* Main Content Layout - Side by side on desktop */}
        <div className="flex flex-col lg:flex-row gap-12 items-start justify-center flex-1">
          
          {/* Left Column: Podium */}
          <div className="w-full lg:w-1/2 flex flex-col items-center justify-end min-h-[400px]">
            {top3.length > 0 && (
              <motion.div className="flex items-end justify-center gap-2 md:gap-4"
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
                {([1, 0, 2] as const).map((entryIdx, slot) => {
                  const entry = top3[entryIdx];
                  if (!entry) return <div key={slot} className="w-32" />;
                  const ranks = [2, 1, 3];
                  const heights = [160, 220, 130];
                  const delays = [0.6, 0.5, 0.7];
                  return (
                    <PodiumBlock key={entry.player_id} entry={entry} rank={ranks[slot]}
                      height={heights[slot]} isSelf={entry.player_id === playerId} delay={delays[slot]} />
                  );
                })}
              </motion.div>
            )}
          </div>

          {/* Right Column: Leaderboard & Results */}
          <div className="w-full lg:w-1/2 flex flex-col gap-6 max-w-md mx-auto lg:mx-0">
            
            {/* Congrats / encouragement message - White background */}
            <motion.div className="text-center px-6 py-6 rounded-3xl bg-white shadow-xl border-2 border-white"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
              {isChampion ? (
                <p className="font-black text-xl text-[#0136fe] uppercase tracking-wide">🎉 Félicitations, Champion ! 🎉</p>
              ) : myEntry ? (
                <p className="font-bold text-lg text-[#0136fe]">Bon travail ! Merci d'avoir joué avec nous 💫</p>
              ) : (
                <p className="font-bold text-lg text-[#0136fe]">Merci d'avoir participé ! 💫</p>
              )}
            </motion.div>

            {/* My score (if not in top 3) */}
            {myEntry && myEntry.rank > 3 && (
              <motion.div className="p-6 rounded-3xl text-center bg-white shadow-xl border-4 border-slate-100"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}>
                <p className="font-bold uppercase tracking-widest text-[#0136fe] opacity-50 mb-2">Votre score final</p>
                <p className="text-5xl font-black text-[#0136fe] mb-1">{myEntry.score}</p>
                <p className="font-bold text-[#0136fe] opacity-70">Rang #{myEntry.rank}</p>
              </motion.div>
            )}

            {/* Remaining players - White backgrounds */}
            {rest.length > 0 && (
              <div className="space-y-3 bg-white/50 p-4 rounded-3xl backdrop-blur-sm">
                <h3 className="font-black text-[#0136fe] uppercase tracking-widest text-center mb-4 text-sm">Suite du classement</h3>
                <div className="max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {rest.map((entry) => {
                    const isSelf = entry.player_id === playerId;
                    return (
                      <div key={entry.player_id} className={`rounded-2xl px-5 py-4 flex items-center gap-4 shadow-sm transition-transform hover:scale-[1.02] ${isSelf ? 'bg-blue-50 border-2 border-[#0136fe]' : 'bg-white border-2 border-slate-100'}`}>
                        <span className="w-8 text-center font-black text-slate-400">#{entry.rank}</span>
                        <span className={`font-bold flex-1 truncate ${isSelf ? 'text-[#0136fe]' : 'text-slate-700'}`}>
                          {entry.name}{isSelf && <span className="ml-2 text-xs font-black uppercase">(vous)</span>}
                        </span>
                        <span className={`font-black tabular-nums ${isSelf ? 'text-[#0136fe]' : 'text-slate-700'}`}>{entry.score} pts</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Personal question breakdown */}
            {playerResults && playerResults.questions.length > 0 && (
              <div className="bg-white/50 p-4 rounded-3xl backdrop-blur-sm">
                {!showBreakdown && (
                  <motion.button
                    onClick={() => setShowBreakdown(true)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-4 rounded-2xl font-black text-[#0136fe] bg-white shadow-xl uppercase tracking-widest hover:bg-slate-50 transition-colors"
                  >
                    Voir vos résultats détaillés
                  </motion.button>
                )}
                {showBreakdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <h2 className="text-xl font-black mb-4 text-center text-[#0136fe] uppercase tracking-wide pt-2">Votre Performance</h2>
                    <div className="max-h-80 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                      {playerResults.questions.map((q, i) => (
                        <div key={q.question_id} className={`rounded-2xl px-5 py-4 flex items-start gap-4 shadow-sm border-2 ${q.is_correct ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-black text-white ${q.is_correct ? "bg-green-500" : "bg-red-500"}`}>
                            {q.is_correct ? "✓" : "✗"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-[#0136fe] mb-2">{i + 1}. {q.question_text}</p>
                            <div className="space-y-1 text-sm bg-white/50 p-2 rounded-xl">
                              <p className="font-semibold text-slate-600">
                                Réponse : <span className={q.is_correct ? "text-green-600" : "text-red-600"}>{q.selected_option_text}</span>
                              </p>
                              {!q.is_correct && (
                                <p className="font-semibold text-slate-600">
                                  Correct : <span className="text-green-600">{q.correct_option_text}</span>
                                </p>
                              )}
                            </div>
                          </div>
                          {q.is_correct && <span className="font-black tabular-nums text-green-600 bg-white px-2 py-1 rounded-lg shadow-sm">+{q.points}</span>}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* Action Buttons - Sticky to bottom on mobile, inline on desktop */}
            <motion.div 
              className="mt-4 pb-8 lg:pb-0"
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 1.2 }}
            >
              {onEnd ? (
                <motion.button onClick={onEnd} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="w-full py-5 rounded-2xl font-black text-xl text-white shadow-[0_15px_40px_rgba(1,54,254,0.35)] uppercase tracking-widest"
                  style={{ background: "#0136fe" }}>
                  {endLabel}
                </motion.button>
              ) : (
                <motion.a href="/join" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="w-full block text-center py-5 rounded-2xl font-black text-xl text-white shadow-[0_15px_40px_rgba(1,54,254,0.35)] uppercase tracking-widest"
                  style={{ background: "#0136fe" }}>
                  Rejouer
                </motion.a>
              )}
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  );
}
