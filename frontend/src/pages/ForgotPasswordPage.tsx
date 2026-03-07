import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";

import { forgotPassword } from "../api/auth";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const res = await forgotPassword(email);
      setMessage(res.message || "Si un compte existe pour cet e-mail, un lien a été envoyé.");
    } catch (err: unknown) {
      const errMsg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Impossible d'envoyer la demande de réinitialisation.";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex items-center justify-center px-4" style={{ background: "#b7f700" }}>
      <div className="fun-pattern" />

      {/* Back button */}
      <motion.div
        className="absolute top-6 left-6 z-20"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <Link
          to="/login"
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm bg-white shadow-lg shadow-black/5 transition-transform hover:scale-105 active:scale-95"
          style={{ color: "#0136fe" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Link>
      </motion.div>

      {/* Floating lanterns */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-24 pointer-events-none">
        {[{ delay: 0, rot: [-5, 5, -5] as [number, number, number] }, { delay: 0.5, rot: [5, -5, 5] as [number, number, number] }].map((l, i) => (
          <motion.div key={i} animate={{ y: [0, -12, 0], rotate: l.rot }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: l.delay }}>
          </motion.div>
        ))}
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <motion.div className="text-center mb-8" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="relative">
              <img src="/favicon.png" alt="Logo" className="w-10 h-10 object-contain drop-shadow-md" />
            </div>
            <span className="text-3xl font-black" style={{ color: "#0136fe", textShadow: "0 0 20px rgba(1,54,254,0.4)" }}>
              {import.meta.env.VITE_APP_NAME || 'Kahoot'}
            </span>
          </div>
          <p className="text-sm" style={{ color: "rgba(1,54,254,0.7)" }}>Mot de passe oublié</p>
        </motion.div>

        {/* Card */}
        <motion.div
          className="rounded-2xl p-8 space-y-5"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,1) 100%)",
            border: "1px solid rgba(1,54,254,0.2)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          }}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>

          {error && (
            <motion.div
              className="text-sm rounded-xl px-4 py-3"
              style={{ background: "rgba(244,67,54,0.1)", border: "1px solid rgba(244,67,54,0.3)", color: "#f44336" }}
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
              {error}
            </motion.div>
          )}
          
          {message && (
            <motion.div
              className="text-sm rounded-xl px-4 py-3"
              style={{ background: "rgba(76, 175, 80, 0.1)", border: "1px solid rgba(76, 175, 80, 0.3)", color: "#2e7d32" }}
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
              {message}
            </motion.div>
          )}

          {!message ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <p className="text-sm" style={{ color: "rgba(1,54,254,0.8)" }}>
                Saisissez l'adresse e-mail associée à votre compte, et nous vous enverrons un lien pour réinitialiser votre mot de passe.
              </p>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "rgba(1,54,254,0.8)" }}>
                  Email
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm text-[#0136fe] outline-none transition"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(1,54,254,0.2)",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "rgba(1,54,254,0.6)")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(1,54,254,0.2)")}
                  placeholder="hôte@exemple.com"
                />
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-sm disabled:cursor-not-allowed text-white"
                style={{
                  background: loading ? "rgba(1,54,254,0.4)" : "#0136fe",
                  boxShadow: loading ? "none" : "0 8px 25px rgba(1,54,254,0.35)",
                }}
                whileHover={!loading ? { scale: 1.02 } : {}}
                whileTap={!loading ? { scale: 0.98 } : {}}>
                {loading ? "Envoi…" : "Réinitialiser mot de passe"}
              </motion.button>
            </form>
          ) : (
            <div className="text-center pt-2">
              <Link to="/login" className="font-semibold transition" style={{ color: "#0136fe" }}>
                Retour à la connexion
              </Link>
            </div>
          )}

        </motion.div>
      </div>
    </div>
  );
}
