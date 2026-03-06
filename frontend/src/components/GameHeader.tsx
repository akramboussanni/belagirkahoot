import { motion } from "motion/react";
import { Users, LogOut } from "lucide-react";

interface GameHeaderProps {
    code: string;
    gameTitle?: string;
    questionInfo?: string;
    answeredCount?: number;
    totalPlayers?: number;
    onExit?: () => void;
    showExit?: boolean;
}

export function GameHeader({
    code,
    gameTitle = "BELAGIR Live",
    questionInfo,
    answeredCount,
    totalPlayers,
    onExit,
    showExit = true
}: GameHeaderProps) {
    return (
        <div className="relative z-20 px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between bg-white border-b-4 border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3">
                <img src="/favicon.png" alt="Logo" className="w-8 h-8 object-contain" />
                <span className="hidden sm:inline text-lg font-black tracking-tight" style={{ color: "#0136fe" }}>{gameTitle}</span>
                <span className="font-black text-xs px-3 py-1 rounded-full bg-slate-100" style={{ color: "#0136fe" }}>PIN: {code}</span>
            </div>

            {questionInfo && (
                <div className="text-sm font-black uppercase tracking-widest opacity-60" style={{ color: "#0136fe" }}>
                    {questionInfo}
                </div>
            )}

            <div className="flex items-center gap-3">
                {answeredCount !== undefined && (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-50 border border-blue-100">
                        <Users className="w-4 h-4" style={{ color: "#0136fe" }} />
                        <span className="font-black text-sm" style={{ color: "#0136fe" }}>{answeredCount}{totalPlayers ? `/${totalPlayers}` : ""}</span>
                    </div>
                )}

                {showExit && onExit && (
                    <motion.button
                        onClick={onExit}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-red-50 text-red-500 border border-red-100"
                    >
                        <LogOut className="w-4 h-4" />
                        <span className="hidden sm:inline">Quitter</span>
                    </motion.button>
                )}
            </div>
        </div>
    );
}
