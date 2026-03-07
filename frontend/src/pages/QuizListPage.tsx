import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Plus, Play, BarChart3, Calendar, Pencil, Trash2 } from "lucide-react";
import { ConfirmModal } from "../components/ConfirmModal";
import { listQuizzes, deleteQuiz } from "../api/quizzes";
import { createSession } from "../api/sessions";

interface PendingDelete {
  id: string;
  title: string;
}

export function QuizListPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  const { data: quizzes = [], isLoading, isError } = useQuery({
    queryKey: ["quizzes"],
    queryFn: listQuizzes,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteQuiz,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      setPendingDelete(null);
    },
  });

  const hostMutation = useMutation({
    mutationFn: createSession,
    onSuccess: (data) => navigate(`/host/lobby/${data.code}`),
  });

  return (
    <div>
      {pendingDelete && (
        <ConfirmModal
          title={`Supprimer "${pendingDelete.title}" ?`}
          message="Cette action est irréversible."
          onConfirm={() => deleteMutation.mutate(pendingDelete.id)}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {/* Header */}
      <motion.div className="flex items-center justify-between mb-8" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-3xl font-black text-[#0136fe]">Bibliothèque</h2>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Link to="/host/quizzes/new"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm"
            style={{ background: "#0136fe", color: "white", boxShadow: "0 4px 20px rgba(1,54,254,0.4)" }}>
            <Plus className="w-4 h-4" />
            Nouveau Quiz
          </Link>
        </motion.div>
      </motion.div>

      {/* States */}
      {isLoading && (
        <div className="flex gap-3 justify-center py-12">
          {[0, 1, 2].map((i) => (
            <motion.div key={i} className="w-3 h-3 rounded-full" style={{ background: "#0136fe" }}
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
          ))}
        </div>
      )}

      {isError && (
        <div className="text-center py-12 rounded-2xl" style={{ background: "rgba(244,67,54,0.1)", border: "1px solid rgba(244,67,54,0.3)" }}>
          <p style={{ color: "#f44336" }}>Échec du chargement des quiz.</p>
        </div>
      )}

      {!isLoading && !isError && quizzes.length === 0 && (
        <motion.div className="text-center py-16 rounded-2xl"
          style={{ background: "rgba(1,54,254,0.05)", border: "2px dashed rgba(1,54,254,0.3)" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p className="text-lg text-[#0136fe] mb-2">Aucun quiz pour le moment.</p>
          <Link to="/host/quizzes/new" className="text-sm font-semibold" style={{ color: "#0136fe" }}>
            Créez votre premier quiz →
          </Link>
        </motion.div>
      )}

      {/* Quiz grid */}
      {quizzes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz, i) => (
            <motion.div key={quiz.id}
              className="p-6 rounded-3xl relative overflow-hidden group border-2 transition-all"
              style={{
                background: "white",
                borderColor: "rgba(1, 54, 254, 0.08)",
                boxShadow: "0 10px 40px rgba(0, 0, 0, 0.03)",
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{
                y: -5,
                borderColor: "rgba(1, 54, 254, 0.2)",
                boxShadow: "0 20px 50px rgba(1, 54, 254, 0.1)"
              }}>

              {/* Top Accent */}
              <div className="absolute top-0 left-0 w-full h-1.5" style={{ background: "#0136fe" }} />

              {/* Quiz info */}
              <div className="mb-6">
                <h3 className="text-xl font-black text-[#0136fe] mb-3 pr-2 leading-tight group-hover:text-[#0136fe]/80 transition-colors">
                  {quiz.title}
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-wider" style={{ color: "rgba(1,54,254,0.5)" }}>
                  {quiz.questions != null && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/5">
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>{quiz.questions.length} questions</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(quiz.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-auto">
                <motion.button
                  onClick={() => hostMutation.mutate(quiz.id)}
                  disabled={hostMutation.isPending}
                  className="flex-1 py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: "#0136fe", color: "white" }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Play className="w-4 h-4 fill-current" />
                  Lancer
                </motion.button>

                <div className="flex gap-2">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Link to={`/host/quizzes/${quiz.id}/edit`}
                      className="w-11 h-11 rounded-2xl flex items-center justify-center border-2 transition-all"
                      style={{ borderColor: "rgba(1, 54, 254, 0.1)", color: "#0136fe" }}>
                      <Pencil className="w-4 h-4" />
                    </Link>
                  </motion.div>

                  <motion.button
                    onClick={() => setPendingDelete({ id: quiz.id, title: quiz.title })}
                    disabled={deleteMutation.isPending}
                    aria-label="Supprimer"
                    className="w-11 h-11 rounded-2xl flex items-center justify-center border-2 transition-all disabled:opacity-50"
                    style={{ borderColor: "rgba(244, 67, 54, 0.1)", color: "#f44336" }}
                    whileHover={{ scale: 1.05, background: "rgba(244, 67, 54, 0.05)" }} whileTap={{ scale: 0.95 }}>
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
