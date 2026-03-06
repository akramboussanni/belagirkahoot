import React from "react";

interface GameBackgroundProps {
    children: React.ReactNode;
    className?: string;
}

export function GameBackground({ children, className = "" }: GameBackgroundProps) {
    return (
        <div className={`min-h-screen w-full relative overflow-hidden flex flex-col ${className}`} style={{ background: "#b7f700" }}>
            <div className="fun-pattern" />
            <div className="relative z-10 w-full flex-1">
                {children}
            </div>
        </div>
    );
}
