import { useState, type FormEvent } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";

import { login } from "../api/auth";
import { useAuthStore } from "../stores/authStore";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const rawFrom = (location.state as { from?: { pathname: string } })?.from?.pathname ?? "/host";
  const from = rawFrom.startsWith("/host/lobby/") || rawFrom.startsWith("/game/") ? "/host" : rawFrom;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { token, host } = await login(email, password);
      setAuth(token, host);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Échec de la connexion. Vérifiez vos identifiants.";
      setError(message);
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
          to="/"
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
        {/* Card */}
        <motion.div
          className="rounded-2xl p-8 space-y-5"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,1) 100%)",
            border: "1px solid rgba(1,54,254,0.2)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          }}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>

          {/* Logo */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="relative">
                <img src="/favicon.png" alt="Logo" className="w-10 h-10 object-contain drop-shadow-md" />

              </div>
              <span className="text-3xl font-black" style={{ color: "#0136fe", textShadow: "0 0 20px rgba(1,54,254,0.4)" }}>
                {import.meta.env.VITE_APP_NAME || 'Kahoot'}
              </span>
            </div>
            <p className="text-sm" style={{ color: "rgba(1,54,254,0.7)" }}>Portail Hôte</p>
          </div>

          {error && (
            <motion.div
              className="text-sm rounded-xl px-4 py-3"
              style={{ background: "rgba(244,67,54,0.1)", border: "1px solid rgba(244,67,54,0.3)", color: "#f44336" }}
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
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

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "rgba(1,54,254,0.8)" }}>
                Mot de passe
              </label>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm text-[#0136fe] outline-none transition"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(1,54,254,0.2)",
                }}
                onFocus={(e) => (e.target.style.borderColor = "rgba(1,54,254,0.6)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(1,54,254,0.2)")}
                placeholder="••••••••"
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
              {loading ? "Connexion…" : "Se connecter"}
            </motion.button>
          </form>

          <p className="text-center text-sm pt-1" style={{ color: "rgba(1,54,254,0.6)" }}>
            Pas de compte ?{" "}
            <Link to="/register" className="font-semibold transition" style={{ color: "#0136fe" }}>
              S'inscrire
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
