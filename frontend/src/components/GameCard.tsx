import { motion } from "motion/react";
import React from "react";

interface GameCardProps {
    children: React.ReactNode;
    className?: string;
    initial?: any;
    animate?: any;
    transition?: any;
}

export function GameCard({ children, className = "", initial, animate, transition }: GameCardProps) {
    return (
        <motion.div
            className={`bg-white rounded-[2.5rem] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.1)] border-4 border-white ${className}`}
            initial={initial ?? { opacity: 0, y: 20 }}
            animate={animate ?? { opacity: 1, y: 0 }}
            transition={transition}
        >
            {children}
        </motion.div>
    );
}
