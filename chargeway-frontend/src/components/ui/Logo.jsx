import React from 'react';

const SIZES = {
  sm: { box: 28, text: "text-base" },
  md: { box: 36, text: "text-lg" },
  lg: { box: 56, text: "text-2xl" },
};

/**
 * ChargeWay brand mark: a bolt inside a hexagon (nods to both "charge"
 * and a honeycomb/battery-cell shape), rendered as pure SVG so it's
 * crisp at any size with zero external/network dependency. The same
 * markup is reused as the browser favicon (public/favicon.svg).
 */
export const LogoMark = ({ size = "md", glow = true, className = "" }) => {
  const s = SIZES[size] || SIZES.md;
  return (
    <div className={`relative flex-shrink-0 ${className}`} style={{ width: s.box, height: s.box }}>
      {glow && (
        <div className="absolute inset-0 rounded-2xl blur-md opacity-50"
          style={{ background: "linear-gradient(135deg, #00C4FF, #0066FF)" }} aria-hidden="true" />
      )}
      <svg width={s.box} height={s.box} viewBox="0 0 40 40" className="relative" role="img" aria-label="ChargeWay logo">
        <defs>
          <linearGradient id="cw-logo-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#00E0FF" />
            <stop offset="100%" stopColor="#0052E0" />
          </linearGradient>
        </defs>
        <path d="M20 1.5 L36.5 11 V29 L20 38.5 L3.5 29 V11 Z" fill="url(#cw-logo-grad)" stroke="rgba(255,255,255,0.2)" strokeWidth="0.75" />
        <path d="M22.5 8 L11 21.5 H18.5 L16.5 32 L29.5 17.5 H21.5 Z" fill="white" />
      </svg>
    </div>
  );
};

const Logo = ({ size = "md", showWordmark = true, className = "" }) => {
  const s = SIZES[size] || SIZES.md;
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <LogoMark size={size} />
      {showWordmark && (
        <span className={`${s.text} font-black tracking-tight`}
          style={{ background: "linear-gradient(90deg, #00C4FF, #60A5FA)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          ChargeWay
        </span>
      )}
    </div>
  );
};

export default Logo;
