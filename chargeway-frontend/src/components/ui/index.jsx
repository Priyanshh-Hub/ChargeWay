import React from 'react';
import { motion } from 'framer-motion';
import Icon from './Icon';

export const GlassCard = ({ children, className = "", style = {} }) => (
  <div className={`rounded-2xl border border-white/10 ${className}`}
    style={{ background: "rgba(15,25,45,0.8)", backdropFilter: "blur(20px)", boxShadow: "0 0 40px rgba(0,100,255,0.08), inset 0 1px 0 rgba(255,255,255,0.05)", ...style }}>
    {children}
  </div>
);

export const InputField = ({ label, type = "text", value, onChange, error, placeholder, autoComplete, required }) => (
  <div>
    <label className="block text-sm font-medium text-slate-300 mb-1.5">
      {label}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} autoComplete={autoComplete}
      className="w-full rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-all border"
      style={{ background: "rgba(255,255,255,0.05)", borderColor: error ? "rgba(248,113,113,0.5)" : "rgba(255,255,255,0.1)" }}
      onFocus={e => { e.target.style.borderColor = "rgba(0,196,255,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(0,196,255,0.1)"; }}
      onBlur={e => { e.target.style.borderColor = error ? "rgba(248,113,113,0.5)" : "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none"; }}
    />
    {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
  </div>
);

export const Btn = ({ children, onClick, disabled, className = "", variant = "primary", type = "button", loading = false }) => {
  const styles = {
    primary: { background: disabled || loading ? "rgba(100,100,100,0.3)" : "linear-gradient(135deg, #0066FF, #00C4FF)", color: "white" },
    danger:  { background: "linear-gradient(135deg, #ef4444, #f97316)", color: "white" },
    success: { background: "linear-gradient(135deg, #10b981, #06b6d4)", color: "white" },
    outline: { background: "rgba(0,196,255,0.05)", border: "1px solid rgba(0,196,255,0.3)", color: "#00C4FF" },
    ghost:   { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8" },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading}
      className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${disabled || loading ? "cursor-not-allowed opacity-50" : "hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"} ${className}`}
      style={styles[variant]}>
      {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
      {children}
    </button>
  );
};

export const Badge = ({ children, color = "blue" }) => {
  const colors = {
    blue:   "text-blue-400 bg-blue-400/10",
    green:  "text-green-400 bg-green-400/10",
    red:    "text-red-400 bg-red-400/10",
    yellow: "text-yellow-400 bg-yellow-400/10",
    purple: "text-purple-400 bg-purple-400/10",
    orange: "text-orange-400 bg-orange-400/10",
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[color]}`}>{children}</span>;
};

export const Spinner = ({ text = "Loading..." }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-5">
    <div className="relative w-16 h-16">
      <div className="absolute inset-0 rounded-full border-2 border-white/5" />
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 border-r-blue-500 animate-spin" />
      <div className="absolute inset-2 rounded-full border border-cyan-400/20 animate-pulse" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-cyan-400 text-lg font-black">⚡</span>
      </div>
    </div>
    <div className="text-center">
      <p className="text-white font-semibold text-sm">ChargeWay</p>
      <p className="text-slate-500 text-xs mt-0.5">{text}</p>
    </div>
  </div>
);

export const Alert = ({ type = "error", message }) => {
  if (!message) return null;
  const cfg = {
    error:   "bg-red-500/10 border-red-500/20 text-red-400",
    info:    "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",
    success: "bg-green-500/10 border-green-500/20 text-green-400",
  };
  return (
    <div className={`flex items-center gap-2 p-3 rounded-xl border text-sm ${cfg[type]}`}>
      <Icon name="info" className="w-4 h-4 flex-shrink-0" />
      {message}
    </div>
  );
};

export const StatCard = ({ label, value, icon, color, sub }) => (
  <div className="rounded-2xl border border-white/10 p-5"
    style={{ background: "rgba(15,25,45,0.8)", backdropFilter: "blur(20px)", boxShadow: "0 0 40px rgba(0,100,255,0.08)" }}>
    <div className="flex items-start justify-between mb-3">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}20` }}>
        <Icon name={icon} className="w-5 h-5" style={{ color }} />
      </div>
      {sub && <Badge color="green">{sub}</Badge>}
    </div>
    <p className="text-2xl font-black text-white mb-0.5">{value}</p>
    <p className="text-xs text-slate-400">{label}</p>
  </div>
);