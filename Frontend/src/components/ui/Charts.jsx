import React from 'react';
import { motion } from 'framer-motion';

export const Sparkline = ({ data, color = "#00C4FF", height = 70 }) => {
  if (!data?.length) return null;
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
  const W = 300, H = height;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * (H - 10) - 5}`).join(" ");
  const gId = `g${color.replace("#", "")}${height}`;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height }}>
      <defs>
        <linearGradient id={gId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={`0,${H} ${pts} ${W},${H}`} fill={`url(#${gId})`} stroke="none" />
    </svg>
  );
};

export const BarChart = ({ data = [], labels = [], color = "#0066FF" }) => {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-1.5 h-36">
      {data.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <motion.div className="w-full rounded-t"
            style={{ background: `linear-gradient(180deg, ${color}, ${color}55)` }}
            initial={{ height: 0 }}
            animate={{ height: `${(v / max) * 130}px` }}
            transition={{ delay: i * 0.04 }} />
          <p className="text-xs text-slate-600 truncate w-full text-center">{labels[i]}</p>
        </div>
      ))}
    </div>
  );
};
