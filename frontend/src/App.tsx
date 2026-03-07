import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { queryClient } from "./api/queryClient";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { HostDashboardPage } from "./pages/HostDashboardPage";
import { QuizListPage } from "./pages/QuizListPage";
import { QuizFormPage } from "./pages/QuizFormPage";
import { HostLobbyPage } from "./pages/HostLobbyPage";
import { HostGamePage } from "./pages/HostGamePage";
import { SessionHistoryPage } from "./pages/SessionHistoryPage";
import { JoinPage } from "./pages/JoinPage";
import { PlayerLobbyPage } from "./pages/PlayerLobbyPage";
import { PlayerGamePage } from "./pages/PlayerGamePage";
import { LandingPage } from "./pages/LandingPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { useAuthStore } from "./stores/authStore";

const NotFound = () => (
  <div className="min-h-screen w-full relative overflow-hidden flex items-center justify-center" style={{ background: "#b7f700" }}>
    <div className="fun-pattern" />
    <div className="relative z-10 text-center text-[#0136fe]">
      <h1 className="text-6xl font-black" style={{ color: "#0136fe" }}>404</h1>
      <p className="mt-2" style={{ color: "rgba(1, 54, 254, 0.7)" }}>Page non trouvée</p>
    </div>
  </div>
);

// Authenticated users skip the landing page and go straight to the dashboard.
function RootRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  return isAuthenticated ? <Navigate to="/host" replace /> : <LandingPage />;
}

function App() {
  return (
  <QueryClientProvider client={queryClient}>
    <Toaster position="top-center" />
    <BrowserRouter>
      <Routes>
        {/* Landing page */}
        <Route path="/" element={<RootRoute />} />

        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected host routes — dashboard shell */}
        <Route
          path="/host"
          element={
            <ProtectedRoute>
              <HostDashboardPage />
            </ProtectedRoute>
          }
        >
          <Route index element={<QuizListPage />} />
          <Route path="quizzes" element={<QuizListPage />} />
          <Route path="quizzes/new" element={<QuizFormPage />} />
          <Route path="quizzes/:quizID/edit" element={<QuizFormPage />} />
          <Route path="history" element={<SessionHistoryPage />} />
        </Route>

        {/* Full-screen host game routes — outside dashboard shell to avoid double layout */}
        <Route path="/host/lobby/:code" element={<ProtectedRoute><HostLobbyPage /></ProtectedRoute>} />
        <Route path="/host/game/:code" element={<ProtectedRoute><HostGamePage /></ProtectedRoute>} />

        {/* Player-facing public routes */}
        <Route path="/join" element={<JoinPage />} />
        <Route path="/game/:code" element={<PlayerLobbyPage />} />
        <Route path="/game/:code/play" element={<PlayerGamePage />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
);
}

export default App;
