import { useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Users } from "lucide-react";

import { getSessionByCode, listSessionPlayers } from "../api/sessions";
import { useWebSocket } from "../hooks/useWebSocket";
import type { WsMessage } from "../types";
import { GameBackground } from "../components/GameBackground";
import { GameCard } from "../components/GameCard";
import { GameBrand } from "../components/GameBrand";

const WS_BASE = import.meta.env.VITE_WS_BASE_URL ?? "ws://localhost:8081";

interface PlayerInfo {
  id: string;
  name: string;
}

interface WsPlayerEvent {
  type: "joined" | "left";
  player_id: string;
  name: string;
}

export function PlayerLobbyPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  const playerId = sessionStorage.getItem("player_id") ?? "";
  const playerName = sessionStorage.getItem("player_name") ?? "";

  const [wsReady, setWsReady] = useState(false);
  const [disconnected, setDisconnected] = useState(false);
  const [wsEvents, setWsEvents] = useState<WsPlayerEvent[]>([]);

  const {
    data: session,
    isLoading: sessionLoading,
    isError: sessionError,
  } = useQuery({
    queryKey: ["session-by-code", code],
    queryFn: () => getSessionByCode(code!),
    enabled: !!code,
    retry: false,
  });

  const { data: initialPlayers } = useQuery({
    queryKey: ["session-players", session?.id],
    queryFn: () => listSessionPlayers(session!.id),
    enabled: !!session?.id,
  });

  const players: PlayerInfo[] = useMemo(() => {
    let result: PlayerInfo[] = (initialPlayers ?? []).map((p) => ({
      id: p.id,
      name: p.name,
    }));
    for (const ev of wsEvents) {
      if (ev.type === "joined" && !result.some((p) => p.id === ev.player_id)) {
        result.push({ id: ev.player_id, name: ev.name });
      } else if (ev.type === "left") {
        result = result.filter((p) => p.id !== ev.player_id);
      }
    }
    return result;
  }, [initialPlayers, wsEvents]);

  const handleMessage = useCallback(
    (msg: WsMessage) => {
      if (msg.type === "player_joined") {
        const payload = msg.payload as { player_id: string; name: string };
        setWsEvents((prev) => [
          ...prev,
          { type: "joined", player_id: payload.player_id, name: payload.name },
        ]);
      } else if (msg.type === "player_left") {
        const payload = msg.payload as { player_id: string };
        setWsEvents((prev) => [
          ...prev,
          { type: "left", player_id: payload.player_id, name: "" },
        ]);
      } else if (msg.type === "game_started") {
        navigate(`/game/${code}/play`);
      }
    },
    [code, navigate],
  );

  useWebSocket({
    url: `${WS_BASE}/api/v1/ws/player/${code}?player_id=${playerId}&name=${encodeURIComponent(playerName)}`,
    onMessage: handleMessage,
    onOpen: () => { setWsReady(true); setDisconnected(false); },
    onClose: () => { setWsReady(false); setDisconnected(true); },
    enabled: !!session && !!playerId && !!code,
  });

  if (sessionLoading) {
    return (
      <GameBackground>
        <div className="min-h-screen flex items-center justify-center">
          <p className="font-black text-xl" style={{ color: "#0136fe" }}>Recherche du jeu…</p>
        </div>
      </GameBackground>
    );
  }

  if (sessionError || !session) {
    return (
      <GameBackground>
        <div className="min-h-screen flex items-center justify-center px-6 text-center">
          <GameCard className="max-w-sm">
            <h1 className="text-3xl font-black text-[#0136fe] mb-2 uppercase tracking-tight">Oups !</h1>
            <p className="mb-8 font-medium" style={{ color: "rgba(1,54,254,0.6)" }}>
              Le code <span className="font-bold underline">{code}</span> n'existe pas.
            </p>
            <button
              onClick={() => navigate("/join")}
              className="w-full py-4 rounded-2xl font-black text-white shadow-xl uppercase tracking-widest transition-all"
              style={{ background: "#ff6b35" }}
            >
              Retour
            </button>
          </GameCard>
        </div>
      </GameBackground>
    );
  }

  if (!playerId || !playerName) {
    return (
      <GameBackground>
        <div className="min-h-screen flex items-center justify-center px-6 text-center">
          <GameCard className="max-w-sm">
            <h1 className="text-2xl font-black text-[#0136fe] mb-8 uppercase tracking-tight">Identité manquante</h1>
            <button
              onClick={() => navigate(`/join?code=${code}`)}
              className="w-full py-4 rounded-2xl font-black text-white shadow-xl uppercase tracking-widest transition-all"
              style={{ background: "#0136fe" }}
            >
              Rejoindre
            </button>
          </GameCard>
        </div>
      </GameBackground>
    );
  }

  return (
    <GameBackground className="items-center">
      <div className="flex-1 flex flex-col items-center pt-24 pb-12 px-6 w-full max-w-lg mx-auto">
        <GameBrand />

        <div className="w-full space-y-8">
          {/* Welcome Card */}
          <GameCard className="text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 opacity-50" style={{ color: "#0136fe" }}>Vous participez en tant que</p>
            <h2 className="text-4xl font-black tracking-tight mb-6" style={{ color: "#0136fe" }}>{playerName}</h2>

            {disconnected ? (
              <div className="py-2 px-4 rounded-xl bg-red-50 border-2 border-red-100 flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <p className="text-xs font-black text-red-500 uppercase tracking-widest">Déconnecté…</p>
              </div>
            ) : (
              <div className="py-4 px-6 rounded-2xl bg-slate-50 border-2 border-slate-100 flex items-center justify-center gap-4">
                <Users className="w-6 h-6" style={{ color: "#0136fe" }} />
                <div className="text-left leading-tight">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40" style={{ color: "#0136fe" }}>Joueurs</p>
                  <p className="text-2xl font-black" style={{ color: "#0136fe" }}>{players.length}</p>
                </div>
              </div>
            )}
          </GameCard>

          {/* Status Message */}
          <div className="text-center space-y-6">
            <p className="text-xl font-black uppercase tracking-widest animate-pulse" style={{ color: "#0136fe" }}>
              {wsReady ? "Prêt à jouer !" : "Connexion en cours…"}
            </p>
            <div className="flex justify-center gap-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-3 h-3 rounded-full"
                  style={{ background: "#0136fe" }}
                  animate={{ scale: [1, 1.3, 1], opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
          </div>

          {/* Player List Card */}
          {players.length > 0 && (
            <div className="space-y-4 pt-4">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-center opacity-40" style={{ color: "#0136fe" }}>Qui est prêt ?</p>
              <div className="grid grid-cols-1 gap-3">
                {players.map((p, i) => (
                  <motion.div
                    key={p.id}
                    className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 flex items-center justify-center gap-3 border-2 border-white shadow-sm"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <p className="font-bold text-center" style={{ color: "#0136fe" }}>{p.name}</p>
                    {p.id === playerId && (
                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-[#b7f700]" style={{ color: "#0136fe" }}>Moi</span>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </GameBackground>
  );
}
