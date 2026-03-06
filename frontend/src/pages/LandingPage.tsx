import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { useNavigate } from "react-router-dom";


/* ─── Geometric ornament ─────────────────────────────────────────────────── */
function StarOrnament({ size = 32, color = "#0136fe", opacity = 0.3 }: { size?: number; color?: string; opacity?: number }) {
  const arms = 8;
  const outer = size / 2;
  const inner = outer * 0.4;
  const cx = outer;
  const cy = outer;
  const pts = Array.from({ length: arms * 2 }, (_, i) => {
    const r = i % 2 === 0 ? outer : inner;
    const angle = (i * Math.PI) / arms - Math.PI / 2;
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(" ");
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <polygon points={pts} fill={color} opacity={opacity} />
    </svg>
  );
}

/* ─── Section divider ────────────────────────────────────────────────────── */
function GeoDivider() {
  return (
    <div className="flex items-center gap-4 justify-center py-2">
      <div style={{ height: 1, flex: 1, background: "linear-gradient(to right, transparent, rgba(1,54,254,0.3))" }} />
      <StarOrnament size={20} opacity={0.6} />
      <StarOrnament size={12} opacity={0.4} />
      <StarOrnament size={20} opacity={0.6} />
      <div style={{ height: 1, flex: 1, background: "linear-gradient(to left, transparent, rgba(1,54,254,0.3))" }} />
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export function LandingPage() {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const moonY = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const moonOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <div style={{ background: "#a5de00", color: "#0136fe", minHeight: "100vh", overflowX: "hidden" }}>
      {/* ── NAV ───────────────────────────────────────────────────────────── */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
          padding: "20px 40px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "linear-gradient(to bottom, #a5de00 0%, transparent 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/favicon.png" alt="Logo" className="w-16 h-16 object-contain drop-shadow-md" />
          <span style={{
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 800,
            fontSize: 20,
            letterSpacing: "0.08em",
            color: "#0136fe",
          }}>
            {import.meta.env.VITE_APP_NAME?.toUpperCase() || 'KAHOOT'}
          </span>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => navigate("/join")}
            style={{
              padding: "8px 20px", borderRadius: 8,
              border: "1px solid rgba(1,54,254,0.4)",
              background: "rgba(1,54,254,0.08)",
              color: "#0136fe", fontWeight: 600, fontSize: 13,
              letterSpacing: "0.05em", cursor: "pointer",
              fontFamily: "'Montserrat', sans-serif",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = "rgba(1,54,254,0.18)"; }}
            onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = "rgba(1,54,254,0.08)"; }}
          >
            Rejoindre
          </button>
          <button
            onClick={() => navigate("/login")}
            style={{
              padding: "8px 20px", borderRadius: 8,
              background: "#0136fe",
              color: "#a5de00", fontWeight: 700, fontSize: 13,
              letterSpacing: "0.05em", cursor: "pointer",
              fontFamily: "'Montserrat', sans-serif",
              border: "none", transition: "all 0.2s",
            }}
            onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = "#ffd700"; }}
            onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = "#0136fe"; }}
          >
            Organiser
          </button>
        </div>
      </motion.nav>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        style={{
          minHeight: "100vh", position: "relative", display: "flex",
          flexDirection: "column", alignItems: "center", justifyContent: "center",
          overflow: "hidden", padding: "120px 24px 80px",
        }}
      >
        {/* Moon */}
        <motion.div
          style={{ position: "absolute", top: "8%", right: "12%", y: moonY, opacity: moonOpacity }}
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
          >
            <img src="/favicon.png" alt="Logo" className="w-16 h-16 object-contain drop-shadow-md" />
          </motion.div>
        </motion.div>

        {/* Ornament row above headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7 }}
          style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28, position: "relative", zIndex: 2 }}
        >
          <StarOrnament size={16} opacity={0.7} />
          <span style={{
            fontSize: 11, letterSpacing: "0.3em", fontWeight: 600,
            color: "#0136fe", textTransform: "uppercase",
            fontFamily: "'Montserrat', sans-serif",
          }}>
            Prêt à jouer
          </span>
          <StarOrnament size={16} opacity={0.7} />
        </motion.div>

        {/* Headline */}
        <div style={{ position: "relative", zIndex: 2, textAlign: "center", maxWidth: 780 }}>
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 900,
              fontSize: "clamp(3rem, 9vw, 7rem)",
              lineHeight: 0.95,
              letterSpacing: "-0.02em",
              color: "#0136fe",
              marginBottom: 0,
            }}
          >
            CÉLÉBREZ
            <br />
            <span style={{
              WebkitTextStroke: "2px #0136fe",
              color: "transparent",
              display: "block",
            }}>
              {import.meta.env.VITE_APP_NAME || 'Kahoot'}.
            </span>
          </motion.h1>

          <motion.h2
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 900,
              fontSize: "clamp(3rem, 9vw, 7rem)",
              lineHeight: 0.95,
              letterSpacing: "-0.02em",
              color: "#0136fe",
              marginTop: 8,
            }}
          >
            VOTRE MONDE
            <br />EN QUIZ.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
            style={{
              marginTop: 28,
              fontSize: "clamp(1rem, 2.5vw, 1.2rem)",
              color: "rgba(1,54,254,0.8)",
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 400,
              lineHeight: 1.7,
              maxWidth: 520,
              margin: "28px auto 0",
            }}
          >
            Un jeu de quiz multijoueur en direct conçu pour les soirées {import.meta.env.VITE_APP_NAME || 'Kahoot'}.
            Défiez vos amis, testez vos connaissances et participez en temps réel.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.7 }}
            style={{ marginTop: 44, display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}
          >
            <button
              onClick={() => navigate("/join")}
              style={{
                padding: "16px 36px", borderRadius: 12,
                background: "#0136fe",
                color: "#a5de00", fontWeight: 800, fontSize: 15,
                letterSpacing: "0.06em", cursor: "pointer",
                fontFamily: "'Montserrat', sans-serif", border: "none",
                boxShadow: "0 0 40px rgba(1,54,254,0.35), 0 8px 24px rgba(0,0,0,0.4)",
                transition: "all 0.2s",
                textTransform: "uppercase",
              }}
              onMouseEnter={e => {
                const b = e.currentTarget;
                b.style.transform = "translateY(-2px)";
                b.style.boxShadow = "0 0 60px rgba(1,54,254,0.5), 0 12px 32px rgba(0,0,0,0.5)";
              }}
              onMouseLeave={e => {
                const b = e.currentTarget;
                b.style.transform = "translateY(0)";
                b.style.boxShadow = "0 0 40px rgba(1,54,254,0.35), 0 8px 24px rgba(0,0,0,0.4)";
              }}
            >
              Rejoindre une partie
            </button>
            <button
              onClick={() => navigate("/login")}
              style={{
                padding: "16px 36px", borderRadius: 12,
                background: "transparent",
                color: "#0136fe", fontWeight: 700, fontSize: 15,
                letterSpacing: "0.06em", cursor: "pointer",
                fontFamily: "'Montserrat', sans-serif",
                border: "1.5px solid rgba(1,54,254,0.25)",
                transition: "all 0.2s",
                textTransform: "uppercase",
              }}
              onMouseEnter={e => {
                const b = e.currentTarget;
                b.style.borderColor = "rgba(1,54,254,0.5)";
                b.style.color = "#0136fe";
              }}
              onMouseLeave={e => {
                const b = e.currentTarget;
                b.style.borderColor = "rgba(1,54,254,0.25)";
                b.style.color = "#0136fe";
              }}
            >
              Organiser un quiz
            </button>
          </motion.div>
        </div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
          style={{ position: "absolute", bottom: 36, left: "50%", transform: "translateX(-50%)", zIndex: 2 }}
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
          >
            <span style={{ fontSize: 10, letterSpacing: "0.25em", color: "rgba(1,54,254,0.5)", fontFamily: "'Montserrat', sans-serif" }}>DÉFILER</span>
            <div style={{ width: 1, height: 40, background: "linear-gradient(to bottom, rgba(1,54,254,0.5), transparent)" }} />
          </motion.div>
        </motion.div>
      </section>


      {/* ── CTA FOOTER ────────────────────────────────────────────────────── */}
      <section style={{ padding: "100px 24px 80px", textAlign: "center", position: "relative", zIndex: 2, overflow: "hidden" }}>
        {/* Background moon glow */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 600, height: 600,
          background: "radial-gradient(circle, rgba(1,54,254,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
            <img src="/favicon.png" alt="Logo" className="w-16 h-16 object-contain drop-shadow-md" />
          </div>

          <h2 style={{
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 900,
            fontSize: "clamp(2.5rem, 7vw, 5.5rem)",
            color: "#0136fe",
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
            marginBottom: 20,
          }}>
            Prêt à jouer ?
          </h2>

          <p style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: 16, color: "rgba(1,54,254,0.8)",
            lineHeight: 1.7, maxWidth: 440, margin: "0 auto 44px",
          }}>
            {import.meta.env.VITE_APP_NAME || 'Kahoot'} Moubarak. Entrez un code de jeu pour rejoindre la session de votre hôte.
          </p>

          <button
            onClick={() => navigate("/join")}
            style={{
              padding: "18px 52px", borderRadius: 14,
              background: "#0136fe",
              color: "#a5de00", fontWeight: 800, fontSize: 16,
              letterSpacing: "0.08em", cursor: "pointer",
              fontFamily: "'Montserrat', sans-serif", border: "none",
              boxShadow: "0 0 60px rgba(1,54,254,0.4), 0 12px 40px rgba(0,0,0,0.5)",
              textTransform: "uppercase",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => {
              const b = e.currentTarget;
              b.style.transform = "translateY(-3px) scale(1.02)";
              b.style.boxShadow = "0 0 80px rgba(1,54,254,0.6), 0 16px 48px rgba(0,0,0,0.6)";
            }}
            onMouseLeave={e => {
              const b = e.currentTarget;
              b.style.transform = "translateY(0) scale(1)";
              b.style.boxShadow = "0 0 60px rgba(1,54,254,0.4), 0 12px 40px rgba(0,0,0,0.5)";
            }}
          >
            Rejoindre une partie
          </button>
        </motion.div>

        {/* Footer line */}
        <div style={{ marginTop: 80 }}>
          <GeoDivider />
          <div style={{ marginTop: 28, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <p style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: 11, color: "rgba(1,54,254,0.6)",
              letterSpacing: "0.08em",
            }}>
              © {new Date().getFullYear()} {import.meta.env.VITE_APP_NAME || 'Kahoot'}. Tous droits réservés.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
