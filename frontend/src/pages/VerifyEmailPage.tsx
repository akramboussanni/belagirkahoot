import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft, CheckCircle, XCircle, Loader2 } from "lucide-react";

import { verifyEmail } from "../api/auth";

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Jeton de vérification manquant ou invalide.");
      return;
    }

    let isMounted = true;
    verifyEmail(token)
      .then(() => {
        if (isMounted) {
          setStatus("success");
          setMessage("Votre adresse e-mail a été vérifiée avec succès. Vous pouvez maintenant vous connecter.");
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setStatus("error");
          const errMsg =
            (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
            "Échec de la vérification de l'adresse e-mail.";
          setMessage(errMsg);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

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
          Connexion
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
          <p className="text-sm" style={{ color: "rgba(1,54,254,0.7)" }}>Vérification d'e-mail</p>
        </motion.div>

        {/* Card */}
        <motion.div
          className="rounded-2xl p-8 flex flex-col items-center text-center space-y-5"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,1) 100%)",
            border: "1px solid rgba(1,54,254,0.2)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          }}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>

          {status === "loading" && (
            <div className="flex flex-col items-center">
              <Loader2 className="w-12 h-12 animate-spin mb-4" style={{ color: "#0136fe" }} />
              <p className="text-sm font-medium" style={{ color: "rgba(1,54,254,0.8)" }}>Vérification en cours...</p>
            </div>
          )}

          {status === "success" && (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
              <CheckCircle className="w-16 h-16 mb-4" style={{ color: "#4CAF50" }} />
              <p className="text-sm font-medium text-gray-800 mb-6">{message}</p>
              <Link
                to="/login"
                className="w-full py-3 px-6 rounded-xl font-bold text-sm text-white"
                style={{
                  background: "#0136fe",
                  boxShadow: "0 8px 25px rgba(1,54,254,0.35)",
                  display: "inline-block"
                }}
              >
                Aller à la connexion
              </Link>
            </motion.div>
          )}

          {status === "error" && (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
              <XCircle className="w-16 h-16 mb-4" style={{ color: "#f44336" }} />
              <p className="text-sm font-medium text-gray-800 mb-6">{message}</p>
              <Link
                to="/login"
                className="w-full py-3 px-6 rounded-xl font-bold text-sm text-[#0136fe] bg-transparent border-2 transition-colors hover:bg-gray-50"
                style={{
                  borderColor: "rgba(1,54,254,0.2)",
                  display: "inline-block"
                }}
              >
                Retour
              </Link>
            </motion.div>
          )}

        </motion.div>
      </div>
    </div>
  );
}
