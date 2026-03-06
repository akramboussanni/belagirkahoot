import { motion } from "motion/react";
import React from "react";

interface GameButtonProps {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    variant?: "primary" | "secondary" | "danger";
    disabled?: boolean;
    type?: "button" | "submit";
}

export function GameButton({
    children,
    onClick,
    className = "",
    variant = "primary",
    disabled = false,
    type = "button"
}: GameButtonProps) {
    const variants = {
        primary: {
            background: "#0136fe",
            color: "#ffffff",
            shadow: "0 15px 40px rgba(1, 54, 254, 0.3)"
        },
        secondary: {
            background: "#ff6b35",
            color: "#ffffff",
            shadow: "0 15px 40px rgba(255, 107, 53, 0.3)"
        },
        danger: {
            background: "#f44336",
            color: "#ffffff",
            shadow: "0 15px 40px rgba(244, 67, 54, 0.3)"
        }
    };

    const style = variants[variant];

    return (
        <motion.button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`py-4 px-8 rounded-2xl font-black text-lg uppercase tracking-widest shadow-xl transition-all disabled:opacity-50 disabled:shadow-none ${className}`}
            style={{
                background: style.background,
                color: style.color,
                boxShadow: disabled ? "none" : style.shadow
            }}
            whileHover={!disabled ? { scale: 1.02, y: -2 } : {}}
            whileTap={!disabled ? { scale: 0.98 } : {}}
        >
            {children}
        </motion.button>
    );
}
