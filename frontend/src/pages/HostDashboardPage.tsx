import { Outlet, useNavigate, NavLink } from "react-router-dom";
import { motion } from "motion/react";

import { useAuthStore } from "../stores/authStore";
import { GameBackground } from "../components/GameBackground";

export function HostDashboardPage() {
  const navigate = useNavigate();
  const { host, clearAuth } = useAuthStore();

  function handleLogout() {
    clearAuth();
    navigate("/login", { replace: true });
  }

  return (
    <GameBackground>

      {/* Header */}
      <header
        className="relative z-20 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 backdrop-blur-md"
        style={{
          background: "rgba(255, 255, 255, 0.8)",
          borderBottom: "2px solid rgba(1, 54, 254, 0.1)",
          boxShadow: "0 4px 30px rgba(0, 0, 0, 0.05)",
        }}
      >
        {/* Logo + Nav */}
        <div className="flex items-center gap-4 sm:gap-8">
          <motion.div
            className="flex items-center gap-2 cursor-pointer"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate("/host")}
          >
            <div className="relative group">
              <img src="/favicon.png" alt="Logo" className="w-9 h-9 object-contain drop-shadow-md transition-transform group-hover:rotate-12" />
            </div>
            <span className="text-2xl font-black tracking-tighter" style={{ color: "#0136fe" }}>
              {import.meta.env.VITE_APP_NAME || 'Kahoot'}
            </span>
          </motion.div>

          <nav className="hidden md:flex items-center gap-2">
            {[
              { to: "/host/quizzes", label: "Mes Quiz" },
              { to: "/host/history", label: "Historique" },
              { to: "/join", label: "Rejoindre" },
            ].map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-xl text-sm font-bold transition-all ${isActive ? "shadow-lg scale-105" : "hover:bg-black/5"
                  }`
                }
                style={({ isActive }) => isActive
                  ? { background: "#0136fe", color: "#b7f700" }
                  : { color: "#0136fe" }}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3 sm:gap-5">
          {host?.email && (
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[10px] uppercase font-bold tracking-widest opacity-40" style={{ color: "#0136fe" }}>Compte Hôte</span>
              <span className="text-sm font-bold truncate max-w-[150px]" style={{ color: "#0136fe" }}>{host.email}</span>
            </div>
          )}
          <motion.button
            onClick={handleLogout}
            whileHover={{ scale: 1.05, backgroundColor: "rgba(244, 67, 54, 0.1)" }}
            whileTap={{ scale: 0.95 }}
            className="text-xs font-bold px-4 py-2 rounded-xl border-2 transition-colors"
            style={{
              color: "#f44336",
              borderColor: "rgba(244, 67, 54, 0.2)",
            }}
          >
            Déconnexion
          </motion.button>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <Outlet />
      </main>
    </GameBackground>
  );
}
