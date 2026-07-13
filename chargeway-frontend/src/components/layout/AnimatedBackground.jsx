import React, { useMemo } from 'react';

// Deterministic pseudo-random particle layout (same every render, no
// per-frame JS — everything below runs purely on CSS animations).
const makeParticles = (count) => {
  let seed = 42;
  const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${(rand() * 100).toFixed(1)}%`,
    size: 1 + rand() * 2.2,
    duration: 18 + rand() * 22,
    delay: -(rand() * 30),
    opacity: 0.15 + rand() * 0.35,
  }));
};

const AnimatedBackground = () => {
  const particles = useMemo(() => makeParticles(22), []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* Layer 4 (base): slow-moving gradient wash */}
      <div className="absolute inset-0 cw-bg-gradient"
        style={{ background: "linear-gradient(135deg, #050D1A 0%, #0A1628 40%, #061020 100%)" }} />
      <div className="absolute inset-0 cw-bg-gradient-move"
        style={{ backgroundImage: "linear-gradient(120deg, rgba(0,102,255,0.08), rgba(0,196,255,0.05), rgba(100,0,255,0.06))", backgroundSize: "200% 200%" }} />

      {/* Layer 2: soft pulsing glows */}
      <div className="absolute w-[36rem] h-[36rem] rounded-full blur-3xl cw-glow-a"
        style={{ left: "10%", top: "65%", background: "radial-gradient(circle, rgba(0,196,255,0.10), transparent 70%)" }} />
      <div className="absolute w-[30rem] h-[30rem] rounded-full blur-3xl cw-glow-b"
        style={{ right: "8%", top: "10%", background: "radial-gradient(circle, rgba(100,0,255,0.08), transparent 70%)" }} />

      {/* Layer 1: fine grid */}
      <div className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "linear-gradient(to right, #3ab6ff 1px, transparent 1px), linear-gradient(to bottom, #3ab6ff 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black 40%, transparent 90%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black 40%, transparent 90%)",
        }} />

      {/* Layer 3: slow floating particles — like Linear/Vercel/Stripe */}
      {particles.map(p => (
        <span key={p.id} className="absolute rounded-full bg-cyan-300 cw-particle"
          style={{
            left: p.left, bottom: "-10px", width: p.size, height: p.size,
            opacity: p.opacity, animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s`,
            boxShadow: "0 0 6px rgba(0,196,255,0.8)",
          }} />
      ))}
    </div>
  );
};

export default AnimatedBackground;
