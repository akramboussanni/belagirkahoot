import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";

import { joinSession } from "../api/sessions";
import { GameBackground } from "../components/GameBackground";
import { GameCard } from "../components/GameCard";

export function JoinPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [code, setCode] = useState((searchParams.get("code") ?? "").replace(/\D/g, "").slice(0, 6));
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isReady = code.length === 6 && name.trim().length > 0;

  function handleCodeChange(value: string) {
    setCode(value.replace(/\D/g, "").slice(0, 6));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isReady) return;
    setError("");
    setLoading(true);
    try {
      const res = await joinSession(code, name.trim());
      sessionStorage.setItem("player_id", res.player_id);
      sessionStorage.setItem("player_name", res.name);
      sessionStorage.setItem("session_id", res.session_id);
      navigate(`/game/${res.code}`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } }; message?: string };
      setError(axiosErr?.response?.data?.error ?? "Échec de la connexion. Vérifiez le code et réessayez.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    background: "rgba(255,255,255,0.08)",
    border: "2px solid rgba(1,54,254,0.25)",
    color: "#0136fe",
  };

  return (
    <GameBackground>
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-12">
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
            <motion.div key={i} animate={{ y: [0, -10, 0], rotate: l.rot }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: l.delay }}>

            </motion.div>
          ))}
        </div>

        {/* Card */}
        <GameCard className="w-full max-w-sm rounded-[2rem] p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-3 mb-2">
              <img src="/favicon.png" alt="Logo" className="w-10 h-10 object-contain drop-shadow-md" />
              <h1 className="text-4xl font-black uppercase tracking-tight" style={{ color: "#0136fe" }}>Rejoindre</h1>
            </div>
            <p className="font-bold opacity-60 uppercase tracking-widest text-xs" style={{ color: "#0136fe" }}>Entrez le code pour jouer</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="room-code" className="block mb-2 text-xs font-black uppercase tracking-widest opacity-60" style={{ color: "#0136fe" }}>
                Code du jeu
              </label>
              <input
                id="room-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                className="w-full px-4 py-4 rounded-2xl text-center font-black text-4xl tracking-[0.3em] outline-none transition-all placeholder:opacity-30 placeholder:tracking-normal"
                style={{ ...inputStyle, background: "rgba(1,54,254,0.05)", border: "2px solid rgba(1,54,254,0.1)" }}
                onFocus={(e) => (e.target.style.borderColor = "#0136fe")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(1,54,254,0.1)")}
                placeholder="000000"
                autoComplete="off"
              />
            </div>

            <div>
              <label htmlFor="your-name" className="block mb-2 text-xs font-black uppercase tracking-widest opacity-60" style={{ color: "#0136fe" }}>
                Votre pseudo
              </label>
              <input
                id="your-name"
                type="text"
                maxLength={30}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-4 rounded-2xl font-black text-xl text-center outline-none transition-all placeholder:opacity-30 placeholder:font-bold"
                style={{ ...inputStyle, background: "rgba(1,54,254,0.05)", border: "2px solid rgba(1,54,254,0.1)" }}
                onFocus={(e) => (e.target.style.borderColor = "#0136fe")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(1,54,254,0.1)")}
                placeholder="Entrez votre nom..."
                autoComplete="off"
              />
            </div>

            {error && (
              <motion.p className="text-sm font-bold text-center bg-red-50 text-red-500 py-3 rounded-xl px-2"
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                {error}
              </motion.p>
            )}

            <motion.button
              type="submit"
              disabled={!isReady || loading}
              className="w-full py-5 rounded-2xl font-black text-xl text-white uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed mt-4 shadow-[0_10px_30px_rgba(1,54,254,0.3)]"
              style={{ background: "#0136fe" }}
              whileHover={isReady && !loading ? { scale: 1.02, y: -2 } : {}}
              whileTap={isReady && !loading ? { scale: 0.98 } : {}}>
              {loading ? "Connexion..." : "C'est parti ! 🚀"}
            </motion.button>
          </form>
        </GameCard>
      </div>
    </GameBackground>
  );
}
