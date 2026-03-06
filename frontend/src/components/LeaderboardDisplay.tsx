import { useLayoutEffect, useRef, useEffect } from "react";
import { motion } from "motion/react";
import type { LeaderboardEntry } from "../types";

interface Props {
  entries: LeaderboardEntry[];
  prevEntries?: LeaderboardEntry[];
  highlightPlayerId?: string;
  maxEntries?: number;
}

const MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3)
    return (
      <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
        style={{ background: rank === 1 ? "rgba(1,54,254,0.2)" : rank === 2 ? "rgba(192,192,192,0.2)" : "rgba(205,127,50,0.2)" }}>
        {MEDALS[rank]}
      </div>
    );
  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
      style={{ background: "rgba(1,54,254,0.15)", color: "#0136fe" }}>
      #{rank}
    </div>
  );
}

export function LeaderboardDisplay({
  entries,
  prevEntries,
  highlightPlayerId,
  maxEntries = 5,
}: Props) {
  const shown = entries.slice(0, maxEntries);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const initRef = useRef({ prevEntries, shown, maxEntries });
  const hasPrev = !!(prevEntries && prevEntries.length > 0);

  useEffect(() => {
    if (hasPrev) return;
  }, [hasPrev]);

  useLayoutEffect(() => {
    const { prevEntries: prev, shown: currentShown, maxEntries: limit } = initRef.current;
    if (!prev || prev.length === 0) return;

    const currentTops = new Map<string, number>();
    itemRefs.current.forEach((el, id) => {
      if (el) currentTops.set(id, el.offsetTop);
    });

    const sortedTops = [...currentTops.values()].sort((a, b) => a - b);
    const stepSize = sortedTops.length > 1 ? sortedTops[1] - sortedTops[0] : 60;

    const prevRankMap = new Map<string, number>();
    prev.slice(0, limit).forEach((e, i) => {
      prevRankMap.set(e.player_id, i);
    });

    itemRefs.current.forEach((el, playerId) => {
      if (!el) return;
      const prevIdx = prevRankMap.get(playerId);
      if (prevIdx === undefined) return;
      const currentIdx = currentShown.findIndex((e) => e.player_id === playerId);
      if (currentIdx === -1) return;
      const delta = (prevIdx - currentIdx) * stepSize;
      if (Math.abs(delta) < 2) return;
      el.style.transition = "none";
      el.style.transform = `translateY(${delta}px)`;
      el.getBoundingClientRect();
      el.style.transition = "transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)";
      el.style.transform = "translateY(0)";
    });
  }, []);

  const setRef = (playerId: string) => (el: HTMLDivElement | null) => {
    if (el) itemRefs.current.set(playerId, el);
    else itemRefs.current.delete(playerId);
  };

  return (
    <div className="space-y-3">
      {shown.map((entry, i) => {
        const isHighlighted = !!highlightPlayerId && entry.player_id === highlightPlayerId;

        return (
          <motion.div
            key={entry.player_id}
            ref={setRef(entry.player_id)}
            initial={!hasPrev ? { opacity: 0, x: -20 } : false}
            animate={!hasPrev ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: i * 0.05 }}
            className={`rounded-2xl px-5 py-4 flex items-center gap-4 shadow-sm border-2 transition-all ${isHighlighted
              ? "bg-white border-[#0136fe] shadow-[0_10px_30px_rgba(1,54,254,0.1)]"
              : "bg-white/90 border-transparent hover:border-slate-100"
              }`}
          >
            <RankBadge rank={entry.rank} />

            <div className="flex-1 min-w-0">
              <p className="font-black text-lg tracking-tight" style={{ color: "#0136fe" }}>{entry.name}</p>
              {isHighlighted && (
                <span className="text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded bg-[#b7f700]" style={{ color: "#0136fe" }}>Vous</span>
              )}
            </div>

            <div className="text-right">
              <span className="font-black text-xl tabular-nums" style={{ color: "#0136fe" }}>
                {entry.score}
              </span>
              <p className="text-[9px] font-black uppercase tracking-widest opacity-30 leading-none" style={{ color: "#0136fe" }}>pts</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
