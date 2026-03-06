import { useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { Sparkles, X } from "lucide-react";
import { generateQuiz, type GenerateQuizResponse } from "../api/ai";

interface Props {
  onClose: () => void;
  onGenerated: (data: GenerateQuizResponse) => void;
}

export function GenerateQuizModal({ onClose, onGenerated }: Props) {
  const [topic, setTopic] = useState("");
  const [url, setUrl] = useState("");
  const [count, setCount] = useState(5);
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const countInvalid = count < 1 || count > 10;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (countInvalid) {
      setError("Maximum 10 questions pour la génération par IA.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const data = await generateQuiz({
        topic: topic.trim(),
        question_count: count,
        context: context.trim(),
        url: url.trim()
      });
      onGenerated(data);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { error?: string } } };
      let msg: string;
      if (axiosErr?.response?.status === 429) {
        msg = axiosErr.response.data?.error ?? "Limite de débit dépassée. Veuillez réessayer plus tard.";
      } else {
        msg = axiosErr?.response?.data?.error ?? "Un problème est survenu. Veuillez réessayer.";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-md rounded-[2.5rem] p-10 relative overflow-hidden"
        style={{
          background: "white",
          border: "2px solid rgba(1, 54, 254, 0.05)",
          boxShadow: "0 30px 100px rgba(0, 0, 0, 0.15)",
        }}
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle decorative elements */}
        <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-[80px]" style={{ background: "rgba(183, 247, 0, 0.4)" }} />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full blur-[80px]" style={{ background: "rgba(1, 54, 254, 0.1)" }} />

        <div className="flex items-center justify-between mb-10 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-[#0136fe] shadow-lg shadow-blue-500/10" style={{ background: "rgba(1, 54, 254, 0.05)" }}>
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-2xl font-black tracking-tight" style={{ color: "#0136fe" }}>IA Générateur</h3>
              <p className="text-[10px] uppercase font-black tracking-widest opacity-40" style={{ color: "#0136fe" }}>Propulsé par Gemini</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="p-2.5 rounded-2xl transition-all hover:bg-black/5" style={{ color: "rgba(1, 54, 254, 0.3)" }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center gap-6 relative z-10">
            <div className="relative">
              <motion.div
                className="absolute inset-0 rounded-full blur-xl"
                style={{ background: "#b7f700" }}
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}>
                <Sparkles className="w-12 h-12" style={{ color: "#0136fe" }} />
              </motion.div>
            </div>
            <div className="text-center">
              <p className="text-lg font-black tracking-tight" style={{ color: "#0136fe" }}>Alchimie en cours...</p>
              <p className="text-xs font-bold opacity-40" style={{ color: "#0136fe" }}>Génération de questions magiques</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black tracking-widest opacity-50 ml-1" style={{ color: "#0136fe" }}>
                Sujet du quiz <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="ex: Astronomie, Sport, Cinéma..."
                className="w-full rounded-2xl px-5 py-4 text-sm outline-none transition-all placeholder:opacity-30 border-2"
                style={{
                  background: "rgba(1, 54, 254, 0.02)",
                  borderColor: "rgba(1, 54, 254, 0.08)",
                  color: "#0136fe"
                }}
                onFocus={(e) => (e.target.style.borderColor = "#0136fe")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(1, 54, 254, 0.08)")}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black tracking-widest opacity-50 ml-1" style={{ color: "#0136fe" }}>
                URL de référence (facultatif)
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://exemple.com/article"
                className="w-full rounded-2xl px-5 py-4 text-sm outline-none transition-all placeholder:opacity-30 border-2"
                style={{
                  background: "rgba(1, 54, 254, 0.02)",
                  borderColor: "rgba(1, 54, 254, 0.08)",
                  color: "#0136fe"
                }}
                onFocus={(e) => (e.target.style.borderColor = "#0136fe")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(1, 54, 254, 0.08)")}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black tracking-widest opacity-50 ml-1" style={{ color: "#0136fe" }}>
                  Questions (1-10)
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full rounded-2xl px-5 py-4 text-sm font-bold outline-none border-2"
                  style={{
                    background: "rgba(1, 54, 254, 0.02)",
                    borderColor: countInvalid ? "rgba(244, 67, 54, 0.2)" : "rgba(1, 54, 254, 0.08)",
                    color: "#0136fe"
                  }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black tracking-widest opacity-50 ml-1" style={{ color: "#0136fe" }}>
                Instructions (facultatif)
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={2}
                placeholder="ex: Difficulté expert, humour..."
                className="w-full rounded-2xl px-5 py-4 text-sm outline-none transition-all resize-none placeholder:opacity-30 border-2"
                style={{
                  background: "rgba(1, 54, 254, 0.02)",
                  borderColor: "rgba(1, 54, 254, 0.08)",
                  color: "#0136fe"
                }}
                onFocus={(e) => (e.target.style.borderColor = "#0136fe")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(1, 54, 254, 0.08)")}
              />
            </div>

            {error && (
              <motion.div
                className="text-xs font-bold rounded-xl px-4 py-3"
                style={{ background: "rgba(244, 67, 54, 0.05)", color: "#f44336" }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}>
                {error}
              </motion.div>
            )}

            <motion.button
              type="submit"
              className="w-full py-4 rounded-2xl font-black text-sm text-white shadow-xl shadow-blue-500/20 tracking-widest uppercase flex items-center justify-center gap-3"
              style={{
                background: "#0136fe",
              }}
              whileHover={{ scale: 1.02, boxShadow: "0 20px 40px rgba(1, 54, 254, 0.25)" }}
              whileTap={{ scale: 0.98 }}>
              <Sparkles className="w-5 h-5 fill-current" />
              Générer maintenant
            </motion.button>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}
