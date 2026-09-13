import React from 'react';

/**
 * ChargeWay's signature visual: a charging connector meeting its port,
 * with current traced as a dashed line animating along the cable
 * (`.cw-current-line` in index.css) and a pulsing contact point where
 * they meet. This is the one deliberately illustrative element in the
 * product — everywhere else stays quiet so this keeps its impact.
 */
export default function ConnectorGraphic({ className = "" }) {
  return (
    <svg
      viewBox="0 0 420 420"
      className={className}
      role="img"
      aria-label="Charging connector"
      fill="none"
    >
      <defs>
        <linearGradient id="cw-connector-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7C6AE8" />
          <stop offset="100%" stopColor="#5B47E0" />
        </linearGradient>
        <radialGradient id="cw-contact-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF8A3D" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FF8A3D" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Ambient contact glow, pulses gently */}
      <circle cx="210" cy="210" r="70" fill="url(#cw-contact-glow)" className="cw-pulse-dot" style={{ transformOrigin: '210px 210px' }} />

      {/* Cable, curling in from the left */}
      <path
        d="M20 320 C 90 320, 90 240, 150 230 C 190 224, 190 210, 210 210"
        stroke="url(#cw-connector-body)"
        strokeWidth="10"
        strokeLinecap="round"
      />
      {/* Current traveling along the cable */}
      <path
        d="M20 320 C 90 320, 90 240, 150 230 C 190 224, 190 210, 210 210"
        stroke="#FF8A3D"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="cw-current-line"
        opacity="0.9"
      />

      {/* Connector head (CCS-style: two pins over a D-shaped port) */}
      <rect x="196" y="150" width="28" height="64" rx="10" fill="url(#cw-connector-body)" />
      <circle cx="210" cy="168" r="5.5" fill="#0A0D14" />
      <circle cx="210" cy="196" r="5.5" fill="#0A0D14" />

      {/* Port the connector is meeting */}
      <path d="M255 150 h60 a16 16 0 0 1 16 16 v96 a16 16 0 0 1 -16 16 h-60 Z"
        fill="none" stroke="#7C6AE8" strokeOpacity="0.35" strokeWidth="2.5" />
      <circle cx="210" cy="210" r="6" fill="#FF8A3D" className="cw-pulse-dot" style={{ transformOrigin: '210px 210px' }} />

      {/* Faint concentric rings, echoing charge radiating outward */}
      <circle cx="210" cy="210" r="120" stroke="#7C6AE8" strokeOpacity="0.12" strokeWidth="1" />
      <circle cx="210" cy="210" r="160" stroke="#7C6AE8" strokeOpacity="0.06" strokeWidth="1" />
    </svg>
  );
}
