import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { Calendar, Users, Hash, ExternalLink, Trash2 } from "lucide-react";
import { ConfirmModal } from "../components/ConfirmModal";
import { listSessions, endSession } from "../api/sessions";
import type { GameStatus } from "../types";

const STATUS_STYLES: Record<GameStatus, { bg: string; color: string; label: string }> = {
  waiting: { bg: "rgba(1,54,254,0.1)", color: "#0136fe", label: "EN ATTENTE" },
  active: { bg: "rgba(76,175,80,0.1)", color: "#4caf50", label: "ACTIVE" },
  finished: { bg: "rgba(0,0,0,0.05)", color: "rgba(1,54,254,0.4)", label: "TERMINÉE" },
};

function StatusBadge({ status }: { status: GameStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span className="text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest whitespace-nowrap"
      style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

export function SessionHistoryPage() {
  const queryClient = useQueryClient();
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const { data: sessions = [], isLoading, isError } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => listSessions(),
  });

  const deleteMutation = useMutation({
    mutationFn: endSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      setPendingDelete(null);
    },
  });

  return (
    <div className="max-w-4xl">
      {pendingDelete && (
        <ConfirmModal
          title="Supprimer cette session ?"
          message="Cette action est irréversible."
          onConfirm={() => deleteMutation.mutate(pendingDelete)}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      <motion.h2 className="text-3xl font-black text-[#0136fe] mb-10 tracking-tight" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        Historique des sessions
      </motion.h2>

      {isLoading && (
        <div className="flex gap-3 justify-center py-20">
          {[0, 1, 2].map((i) => (
            <motion.div key={i} className="w-3 h-3 rounded-full" style={{ background: "#0136fe" }}
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
          ))}
        </div>
      )}

      {isError && (
        <div className="text-center py-16 rounded-[2.5rem]" style={{ background: "rgba(244,67,54,0.05)", border: "2px solid rgba(244,67,54,0.1)" }}>
          <p className="font-bold text-red-500">Échec du chargement de l'historique.</p>
        </div>
      )}

      {!isLoading && !isError && sessions.length === 0 && (
        <motion.div className="text-center py-20 rounded-[2.5rem]"
          style={{ background: "rgba(1,54,254,0.02)", border: "2px dashed rgba(1,54,254,0.1)" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p className="text-xl font-black text-[#0136fe] mb-2">Aucune session pour le moment</p>
          <p className="text-sm font-bold opacity-40" style={{ color: "#0136fe" }}>Lancez un jeu depuis votre bibliothèque pour commencer.</p>
        </motion.div>
      )}

      {sessions.length > 0 && (
        <div className="space-y-4">
          {sessions.map((s, i) => (
            <motion.div key={s.id}
              className="px-6 py-5 rounded-[2rem] flex flex-col md:flex-row md:items-center gap-5 border-2 transition-all"
              style={{
                background: "white",
                borderColor: "rgba(1, 54, 254, 0.05)",
                boxShadow: "0 10px 40px rgba(0, 0, 0, 0.02)",
              }}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              whileHover={{ borderColor: "rgba(1, 54, 254, 0.15)", boxShadow: "0 20px 50px rgba(1, 54, 254, 0.05)" }}>

              {/* Quiz title + meta */}
              <div className="flex-1 min-w-0">
                <p className="text-lg font-black text-[#0136fe] truncate mb-2">{s.quiz_title}</p>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/5 text-[10px] font-black uppercase tracking-widest" style={{ color: "rgba(1, 54, 254, 0.5)" }}>
                    <Hash className="w-3 h-3" />
                    <span>{s.code}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/5 text-[10px] font-black uppercase tracking-widest" style={{ color: "rgba(1, 54, 254, 0.5)" }}>
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(s.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/5 text-[10px] font-black uppercase tracking-widest" style={{ color: "rgba(1, 54, 254, 0.5)" }}>
                    <Users className="w-3 h-3" />
                    <span>{s.player_count} Joueurs</span>
                  </div>
                </div>
              </div>

              {/* Status + actions */}
              <div className="flex items-center gap-4 pt-4 md:pt-0 border-t md:border-t-0 border-black/5">
                <StatusBadge status={s.status} />
                {s.status === "waiting" && (
                  <div className="flex items-center gap-2">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Link to={`/host/lobby/${s.code}`}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/10"
                        style={{ background: "#0136fe", color: "white" }}>
                        <ExternalLink className="w-4 h-4" />
                        Reprendre
                      </Link>
                    </motion.div>
                    <motion.button
                      onClick={() => setPendingDelete(s.id)}
                      disabled={deleteMutation.isPending}
                      aria-label="Supprimer"
                      className="p-2.5 rounded-xl transition-all hover:bg-red-50 disabled:opacity-50"
                      style={{ color: "#f44336", border: "2px solid rgba(244, 67, 54, 0.1)" }}
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
