import React from 'react';

// Maps a vehicle's color name (as stored in the catalog/DB) to a paint gradient.
// Falls back to a cyan ChargeWay-branded gradient for anything unrecognized.
const PAINT = {
  teal:    ["#0d9488", "#2dd4bf"],
  blue:    ["#1d4ed8", "#3b82f6"],
  gray:    ["#475569", "#94a3b8"],
  grey:    ["#475569", "#94a3b8"],
  white:   ["#cbd5e1", "#f8fafc"],
  black:   ["#18181b", "#3f3f46"],
  red:     ["#b91c1c", "#ef4444"],
  green:   ["#15803d", "#4ade80"],
  yellow:  ["#a16207", "#facc15"],
  silver:  ["#64748b", "#cbd5e1"],
};
const DEFAULT_PAINT = ["#0066FF", "#00C4FF"];

const getPaint = (colorName = "") => PAINT[colorName.toLowerCase().trim()] || DEFAULT_PAINT;

/**
 * A self-contained, illustrated EV card. No network requests, no broken
 * hotlinked images, no copyrighted manufacturer photography — just a clean
 * vector rendering that always looks the same regardless of network
 * conditions or CORS/hotlink restrictions.
 */
const VehicleVisual = ({ color, connectorType = "CCS2", size = "md", charging = false, className = "" }) => {
  const [dark, light] = getPaint(color);
  const gradId = `cw-paint-${dark.replace("#", "")}`;
  const glowId = `cw-glow-${dark.replace("#", "")}`;

  const heights = { sm: 96, md: 144, lg: 192 };
  const h = heights[size] || heights.md;

  return (
    <div className={`relative w-full flex items-center justify-center overflow-hidden ${className}`}
      style={{ height: h, background: "radial-gradient(ellipse at 50% 60%, rgba(0,196,255,0.10), transparent 70%)" }}>
      <svg viewBox="0 0 320 160" className="w-full h-full" style={{ maxWidth: 420 }} role="img" aria-label={`Vehicle illustration, ${color || "default"} paint`}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={light} />
            <stop offset="100%" stopColor={dark} />
          </linearGradient>
          <radialGradient id={glowId} cx="50%" cy="90%" r="60%">
            <stop offset="0%" stopColor="#00C4FF" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#00C4FF" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ground glow */}
        <ellipse cx="160" cy="132" rx="120" ry="14" fill={`url(#${glowId})`} />

        {/* Body */}
        <path
          d="M40 112 C40 96 54 90 70 88 L96 66 C104 58 116 54 128 54 L206 54 C220 54 232 60 240 70 L256 88 C272 90 284 98 284 112 L284 118 C284 123 280 126 275 126 L52 126 C46 126 42 122 42 117 Z"
          fill={`url(#${gradId})`} stroke="rgba(0,0,0,0.15)" strokeWidth="1"
        />
        {/* Windshield / cabin glass */}
        <path d="M104 87 L124 63 C129 58 136 55 143 55 L198 55 C205 55 211 58 216 63 L234 87 Z"
          fill="rgba(15,25,45,0.55)" />
        {/* Door seam */}
        <line x1="168" y1="88" x2="168" y2="126" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />
        {/* Headlight / taillight accents */}
        <rect x="272" y="96" width="10" height="6" rx="2" fill="#e2f7ff" opacity="0.9" />
        <rect x="46" y="98" width="8" height="5" rx="2" fill="#ff6b6b" opacity="0.85" />

        {/* Wheels */}
        {[92, 234].map((cx) => (
          <g key={cx}>
            <circle cx={cx} cy="126" r="19" fill="#0b1220" />
            <circle cx={cx} cy="126" r="19" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
            <circle cx={cx} cy="126" r="9" fill="#1e293b" />
            <circle cx={cx} cy="126" r="3" fill="#475569" />
          </g>
        ))}

        {/* Charge port + bolt, glows when actively charging */}
        <g transform="translate(198, 74)">
          <circle r="9" fill="rgba(0,196,255,0.15)" stroke="#00C4FF" strokeWidth="1.2">
            {charging && <animate attributeName="r" values="8;11;8" dur="1.4s" repeatCount="indefinite" />}
          </circle>
          <path d="M1 -4 L-3 1 L0 1 L-1 5 L4 -1 L1 -1 Z" fill="#00C4FF" />
        </g>
      </svg>
    </div>
  );
};

export default VehicleVisual;
