import { Outlet, useNavigate, NavLink } from "react-router-dom";
import { motion } from "motion/react";

import { useAuthStore } from "../stores/authStore";

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { admin, clearAuth } = useAuthStore();

  function handleLogout() {
    clearAuth();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen" style={{ background: "#b7f700" }}>
      <div className="fun-pattern" />

      {/* Header */}
      <header
        className="relative z-20 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(240,240,240,1) 100%)",
          borderBottom: "1px solid rgba(1,54,254, 0.2)",
        }}
      >
        {/* Logo + Nav */}
        <div className="flex items-center gap-3 sm:gap-6">
          <motion.div className="flex items-center gap-2" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
            <div className="relative">
              <img src="/favicon.png" alt="Logo" className="w-8 h-8 object-contain drop-shadow-md" />
              
            </div>
            <span className="text-xl font-black" style={{ color: "#0136fe" }}>{import.meta.env.VITE_APP_NAME || 'Kahoot'}</span>
          </motion.div>

          <nav className="flex items-center gap-0.5 sm:gap-1">
            <NavLink to="/admin/quizzes"
              className={({ isActive }) =>
                `px-2.5 sm:px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "text-[#b7f700] font-bold"
                    : "hover:opacity-100 opacity-70'"}` }
              style={({ isActive }) => isActive
                ? { background: "#0136fe", color: "#b7f700" }
                : { color: "#0136fe" }}>
              Quizzes
            </NavLink>
            <NavLink to="/admin/history"
              className={({ isActive }) =>
                `px-2.5 sm:px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  isActive ? "font-bold" : "opacity-70 hover:opacity-100"
                }`}
              style={({ isActive }) => isActive
                ? { background: "#0136fe", color: "#b7f700" }
                : { color: "#0136fe" }}>
              History
            </NavLink>
          </nav>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-4">
          {admin?.email && (
            <span className="hidden sm:block text-sm truncate max-w-[180px]" style={{ color: "rgba(1,54,254,0.8)" }}>{admin.email}</span>
          )}
          <motion.button onClick={handleLogout} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="text-sm font-medium px-3 sm:px-4 py-2 rounded-lg transition"
            style={{ color: "rgba(1,54,254,0.8)", border: "1px solid rgba(255,255,255,0.15)" }}>
            Sign out
          </motion.button>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <Outlet />
      </main>
    </div>
  );
}
