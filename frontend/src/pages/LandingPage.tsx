import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "motion/react";
import { useAuthStore } from "../stores/authStore";
import { GameBackground } from "../components/GameBackground";
import { GameCard } from "../components/GameCard";

export function LandingPage() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (token) {
      navigate("/host", { replace: true });
    }
  }, [token, navigate]);

  return (
    <GameBackground>
      <div className="flex flex-1 items-center justify-center p-6 min-h-[100dvh] w-full">
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-lg"
        >
          <GameCard className="flex flex-col items-center p-10 sm:p-16 border-8 border-white shadow-[0_40px_100px_rgba(0,0,0,0.1)]">

            <div className="mb-10 flex flex-col items-center">
              <motion.img
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                src="/favicon.png"
                alt="Logo"
                className="w-32 h-32 object-contain drop-shadow-xl mb-6"
              />
              <h1 className="text-5xl sm:text-6xl font-black text-center tracking-tighter leading-none" style={{ color: "#0136fe" }}>
                {import.meta.env.VITE_APP_NAME || "Kahoot"}
              </h1>
            </div>

            <div className="w-full space-y-4">
              <button
                onClick={() => navigate("/join")}
                className="w-full py-5 rounded-2xl font-black text-xl tracking-widest uppercase transition-transform shadow-[0_15px_40px_rgba(1,54,254,0.35)] hover:scale-105 active:scale-95"
                style={{ background: "#0136fe", color: "white" }}
              >
                Rejoindre
              </button>

              <button
                onClick={() => navigate("/login")}
                className="w-full py-4 rounded-2xl font-black text-sm tracking-widest uppercase transition-all border-[3px] hover:scale-[1.02] active:scale-95"
                style={{ borderColor: "#0136fe", color: "#0136fe", background: "transparent" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(1,54,254,0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                Organiser
              </button>
            </div>

            <div className="mt-10 pt-8 border-t-[3px] border-slate-50 w-full text-center">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(1,54,254,0.4)" }}>Nouveau ?</p>
              <Link to="/register" className="inline-block mt-2 text-sm font-black uppercase tracking-widest hover:scale-105 transition-transform" style={{ color: "#0136fe" }}>
                Créer un compte
              </Link>
            </div>

          </GameCard>
        </motion.div>
      </div>
    </GameBackground>
  );
}
