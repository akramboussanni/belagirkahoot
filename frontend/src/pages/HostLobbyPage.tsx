import { useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Users } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { getSessionByCode, listSessionPlayers, startSession } from "../api/sessions";
import { useWebSocket } from "../hooks/useWebSocket";
import { useGameStore } from "../stores/gameStore";
import type { WsMessage, GamePlayer } from "../types";
import { GameBackground } from "../components/GameBackground";
import { GameCard } from "../components/GameCard";

const WS_BASE = import.meta.env.VITE_WS_BASE_URL ?? "ws://localhost:8081";

interface WsPlayerEvent {
  type: "joined" | "left";
  player_id: string;
  name: string;
}

const PLAYER_COLORS = [
  "#0136fe", "#ff6b35", "#4caf50", "#2196f3", "#f44336",
  "#9c27b0", "#00bcd4", "#ff9800",
];

export function HostLobbyPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [wsReady, setWsReady] = useState(false);
  const [wsEvents, setWsEvents] = useState<WsPlayerEvent[]>([]);
  const [copied, setCopied] = useState(false);

  const { data: session, isError } = useQuery({
    queryKey: ["session-by-code", code],
    queryFn: () => getSessionByCode(code!),
    enabled: !!code,
  });

  const { data: initialPlayers } = useQuery({
    queryKey: ["session-players", session?.id],
    queryFn: () => listSessionPlayers(session!.id),
    enabled: !!session?.id,
  });

  const players: GamePlayer[] = useMemo(() => {
    let result = [...(initialPlayers ?? [])];
    for (const ev of wsEvents) {
      if (ev.type === "joined" && !result.some((p) => p.id === ev.player_id)) {
        result.push({
          id: ev.player_id,
          session_id: session?.id ?? "",
          name: ev.name,
          score: 0,
          joined_at: new Date().toISOString(),
        });
      } else if (ev.type === "left") {
        result = result.filter((p) => p.id !== ev.player_id);
      }
    }
    return result;
  }, [initialPlayers, wsEvents, session?.id]);

  const handleMessage = useCallback((msg: WsMessage) => {
    if (msg.type === "player_joined") {
      const payload = msg.payload as { player_id: string; name: string };
      setWsEvents((prev) => [...prev, { type: "joined", player_id: payload.player_id, name: payload.name }]);
    } else if (msg.type === "player_left") {
      const payload = msg.payload as { player_id: string };
      setWsEvents((prev) => [...prev, { type: "left", player_id: payload.player_id, name: "" }]);
    } else if (msg.type === "game_started") {
      navigate(`/host/game/${code}`);
    }
  }, [code, navigate]);

  useWebSocket({
    url: `${WS_BASE}/api/v1/ws/host/${code}`,
    onMessage: handleMessage,
    onOpen: () => setWsReady(true),
    onClose: () => setWsReady(false),
    enabled: !!code && !!session,
  });

  const setActiveSession = useGameStore((s) => s.setActiveSession);
  const startMutation = useMutation({
    mutationFn: () => startSession(session!.id),
    onSuccess: () => setActiveSession({ sessionId: session!.id, code: code! }),
  });

  const joinUrl = `${window.location.origin}/join?code=${code}`;

  function handleCopyUrl() {
    navigator.clipboard.writeText(joinUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (isError) {
    return (
      <GameBackground>
        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <GameCard className="text-center">
            <h1 className="text-4xl font-black text-[#0136fe] mb-2">Oops !</h1>
            <p className="font-bold text-slate-500">Session non trouvée.</p>
            <button onClick={() => navigate("/host")} className="mt-6 px-6 py-3 rounded-2xl bg-[#0136fe] text-white font-black uppercase tracking-widest shadow-xl">
              Retour
            </button>
          </GameCard>
        </div>
      </GameBackground>
    );
  }

  return (
    <GameBackground className="flex flex-col items-center">

      {/* Top Join Pill */}
      <motion.div
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed top-6 z-20"
      >
        <div className="bg-white px-8 py-3 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.08)] border-4 border-white flex items-center gap-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "rgba(1,54,254,0.4)" }}>Rejoindre sur</p>
          <p className="font-black text-lg tracking-tight" style={{ color: "#0136fe" }}>{window.location.host}/join</p>
        </div>
      </motion.div>

      <div className="relative z-10 w-full max-w-5xl px-6 py-32 flex flex-col items-center">

        {/* Hero Instruction Area - Now Horizontal and Integrated */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full bg-white rounded-[4rem] p-10 sm:p-16 shadow-[0_30px_80px_rgba(0,0,0,0.06)] border-8 border-white flex flex-col lg:flex-row items-center justify-between gap-12 mb-16"
        >
          <div className="flex flex-col items-center lg:items-start space-y-2">
            <div className="flex items-center gap-3">
              <p className="text-xs font-black uppercase tracking-[0.4em]" style={{ color: "rgba(1,54,254,0.3)" }}>Code PIN du jeu</p>
              <div className={`w-2.5 h-2.5 rounded-full ${wsReady ? "bg-[#0136fe]" : "bg-yellow-500"} animate-pulse`} />
            </div>
            <h1 className="text-8xl sm:text-[11rem] font-black leading-[0.85] tracking-tighter" style={{ color: "#0136fe" }}>
              {code}
            </h1>
          </div>

          <div className="flex flex-col items-center gap-4 shrink-0">
            <div className="p-3 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 shadow-inner group transition-transform hover:scale-105">
              <QRCodeSVG
                value={joinUrl}
                size={160}
                level="H"
              />
            </div>
            <button
              onClick={handleCopyUrl}
              className="px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
              style={{ background: copied ? "#abed00" : "rgba(1,54,254,0.05)", color: "#0136fe" }}
            >
              {copied ? "Lien copié !" : "Copier le lien"}
            </button>
          </div>
        </motion.div>

        {/* Players Area - Organic Flow */}
        <div className="w-full space-y-8 pb-32">
          <div className="flex items-center justify-center gap-3">
            <Users className="w-6 h-6" style={{ color: "#0136fe" }} />
            <h2 className="text-2xl font-black text-center" style={{ color: "#0136fe" }}>
              Joueurs <span className="opacity-30">({players.length})</span>
            </h2>
          </div>

          {players.length === 0 ? (
            <motion.div
              className="py-20 rounded-[3.5rem] border-4 border-dashed border-white/40 flex flex-col items-center justify-center"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            >
              <div className="w-16 h-16 rounded-full border-4 border-white/20 flex items-center justify-center mb-6">
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-4 h-4 rounded-full" style={{ background: "#0136fe" }}
                />
              </div>
              <p className="text-lg font-black opacity-30 uppercase tracking-widest" style={{ color: "#0136fe" }}>En attente de génies...</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
              {players.map((player, i) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white rounded-[2rem] p-5 flex flex-col items-center gap-3 shadow-lg shadow-black/5 border-2 border-white group hover:-translate-y-1 transition-transform"
                >
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-md"
                    style={{ background: PLAYER_COLORS[i % PLAYER_COLORS.length] }}>
                    {player.name[0]?.toUpperCase()}
                  </div>
                  <span className="font-black text-sm truncate w-full text-center" style={{ color: "#0136fe" }}>{player.name}</span>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Start Button Area - Fixed Float */}
        <div className="fixed bottom-0 left-0 right-0 p-8 flex justify-center bg-gradient-to-t from-[#b7f700] via-[#b7f700]/90 to-transparent pointer-events-none z-30">
          <motion.button
            onClick={() => startMutation.mutate()}
            disabled={players.length === 0 || startMutation.isPending}
            className="w-full max-w-md py-6 rounded-full font-black text-xl shadow-[0_20px_50px_rgba(1,54,254,0.3)] uppercase tracking-widest transition-all pointer-events-auto active:scale-95 disabled:opacity-50"
            style={{
              background: players.length > 0 && !startMutation.isPending ? "#0136fe" : "rgba(1, 54, 254, 0.2)",
              color: "#ffffff",
            }}
            initial={{ y: 100 }}
            animate={{ y: 0 }}
          >
            {startMutation.isPending ? "Démarrage..." : "Démarrer le jeu 🚀"}
          </motion.button>
          {startMutation.isError && (
            <p className="pointer-events-auto absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] font-black text-red-500 uppercase tracking-widest bg-white px-4 py-1 rounded-full shadow-sm">
              Échec du lancement
            </p>
          )}
        </div>
      </div>
    </GameBackground>
  );
}
