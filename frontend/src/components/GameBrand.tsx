import { motion } from "motion/react";

export function GameBrand() {
    return (
        <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white px-8 py-3 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.08)] border-4 border-white flex items-center gap-3 mb-12"
        >
            <img src="/favicon.png" alt="Logo" className="w-8 h-8 object-contain" />
            <span className="font-black text-2xl tracking-tight" style={{ color: "#0136fe" }}>BELAGIR</span>
        </motion.div>
    );
}
