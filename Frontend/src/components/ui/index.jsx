import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from './Icon';
import { getPasswordStrength } from '../../utils/passwordStrength';

export const GlassCard = React.forwardRef(({ children, className = "", style = {}, ...rest }, ref) => (
  <div ref={ref} className={`rounded-2xl border border-white/10 ${className}`}
    style={{ background: "rgba(15,25,45,0.8)", backdropFilter: "blur(20px)", boxShadow: "0 0 40px rgba(0,100,255,0.08), inset 0 1px 0 rgba(255,255,255,0.05)", ...style }}
    {...rest}>
    {children}
  </div>
));

export const InputField = ({ label, type = "text", value, onChange, onBlur, error, valid, placeholder, autoComplete, required, id }) => (
  <div>
    {label && (
      <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
    )}
    <div className="relative">
      <input id={id} type={type} value={value} onChange={onChange} placeholder={placeholder} autoComplete={autoComplete}
        className="w-full rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-all border"
        style={{ background: "rgba(255,255,255,0.05)", borderColor: error ? "rgba(248,113,113,0.5)" : valid ? "rgba(52,211,153,0.5)" : "rgba(255,255,255,0.1)", paddingRight: valid ? "2.5rem" : undefined }}
        onFocus={e => { e.target.style.borderColor = "rgba(0,196,255,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(0,196,255,0.1)"; }}
        onBlur={e => { e.target.style.borderColor = error ? "rgba(248,113,113,0.5)" : valid ? "rgba(52,211,153,0.5)" : "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none"; if (onBlur) onBlur(e); }}
      />
      {valid && !error && (
        <Icon name="check" className="w-4 h-4 text-emerald-400 absolute right-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
      )}
    </div>
    {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
  </div>
);

export const Btn = ({ children, onClick, disabled, className = "", variant = "primary", type = "button", loading = false, ...rest }) => {
  const styles = {
    primary: { background: disabled || loading ? "rgba(100,100,100,0.3)" : "linear-gradient(135deg, #0066FF, #00C4FF)", color: "white" },
    danger:  { background: "linear-gradient(135deg, #ef4444, #f97316)", color: "white" },
    success: { background: "linear-gradient(135deg, #10b981, #06b6d4)", color: "white" },
    outline: { background: "rgba(0,196,255,0.05)", border: "1px solid rgba(0,196,255,0.3)", color: "#00C4FF" },
    ghost:   { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8" },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading} aria-busy={loading} aria-disabled={disabled || loading}
      className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${disabled || loading ? "cursor-not-allowed opacity-50" : "hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"} ${className}`}
      style={styles[variant]} {...rest}>
      {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />}
      {loading && <span className="sr-only">Loading</span>}
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
    error:   { cls: "bg-red-500/10 border-red-500/20 text-red-400",     icon: "warning" },
    info:    { cls: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",   icon: "info" },
    success: { cls: "bg-green-500/10 border-green-500/20 text-green-400", icon: "check" },
    warning: { cls: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400", icon: "warning" },
  };
  const c = cfg[type] || cfg.error;
  return (
    <div className={`flex items-center gap-2 p-3 rounded-xl border text-sm ${c.cls}`} role="alert">
      <Icon name={c.icon} className="w-4 h-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
};

// ── Checkbox ─────────────────────────────────────────────────
export const Checkbox = ({ checked, onChange, label, error, id }) => (
  <div>
    <label htmlFor={id} className="flex items-start gap-2.5 cursor-pointer select-none group">
      <span
        onClick={() => onChange && onChange(!checked)}
        role="checkbox"
        aria-checked={checked}
        tabIndex={0}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onChange && onChange(!checked); } }}
        className="mt-0.5 w-4.5 h-4.5 rounded-md flex items-center justify-center flex-shrink-0 transition-all border"
        style={{
          width: 18, height: 18,
          background: checked ? "linear-gradient(135deg,#0066FF,#00C4FF)" : "rgba(255,255,255,0.05)",
          borderColor: checked ? "transparent" : error ? "rgba(248,113,113,0.5)" : "rgba(255,255,255,0.2)",
        }}>
        {checked && <Icon name="check" className="w-3 h-3 text-white" />}
      </span>
      <span className="text-sm text-slate-300 leading-snug">{label}</span>
    </label>
    {error && <p className="text-red-400 text-xs mt-1 ml-6">{error}</p>}
  </div>
);

// ── Password Input (show/hide + caps lock + strength meter) ──
export const PasswordInput = ({
  label, value, onChange, error, placeholder, required, autoComplete = "off",
  showStrength = false, showRules = false, id,
}) => {
  const [visible, setVisible] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const strength = showStrength ? getPasswordStrength(value) : null;

  const handleKey = (e) => {
    if (typeof e.getModifierState === "function") {
      setCapsOn(e.getModifierState("CapsLock"));
    }
  };

  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1.5">
          {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          onKeyUp={handleKey}
          onKeyDown={handleKey}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full rounded-xl pl-4 pr-11 py-2.5 text-white text-sm outline-none transition-all border"
          style={{ background: "rgba(255,255,255,0.05)", borderColor: error ? "rgba(248,113,113,0.5)" : "rgba(255,255,255,0.1)" }}
          onFocus={e => { e.target.style.borderColor = "rgba(0,196,255,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(0,196,255,0.1)"; }}
          onBlur={e => { e.target.style.borderColor = error ? "rgba(248,113,113,0.5)" : "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none"; setCapsOn(false); }}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-400 transition-colors"
          aria-label={visible ? "Hide password" : "Show password"}>
          <Icon name={visible ? "eyeOff" : "eye"} className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
        </button>
      </div>

      {capsOn && (
        <p className="flex items-center gap-1 text-yellow-400 text-xs mt-1.5">
          <Icon name="warning" className="w-3.5 h-3.5" /> Caps Lock is on
        </p>
      )}

      {showStrength && value && (
        <div className="mt-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${strength.percent}%`, background: strength.color }} />
            </div>
            <span className="text-xs font-medium" style={{ color: strength.color }}>{strength.label}</span>
          </div>
          {showRules && strength.unmet.length > 0 && (
            <ul className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5">
              {strength.unmet.map(r => (
                <li key={r.id} className="text-xs text-slate-500 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-slate-600 flex-shrink-0" />{r.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
};

// ── Skeleton loaders ─────────────────────────────────────────
export const Skeleton = ({ className = "", style = {} }) => (
  <div className={`rounded-lg animate-pulse ${className}`}
    style={{ background: "linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.09), rgba(255,255,255,0.04))", backgroundSize: "200% 100%", animation: "cw-shimmer 1.6s ease-in-out infinite", ...style }} />
);

export const CardSkeleton = () => (
  <GlassCard className="p-6 space-y-4">
    <Skeleton className="h-5 w-2/3" />
    <Skeleton className="h-3 w-full" />
    <Skeleton className="h-3 w-5/6" />
    <div className="flex gap-2 pt-1">
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-8 w-20" />
    </div>
  </GlassCard>
);

// ── Modal ────────────────────────────────────────────────────
let modalIdCounter = 0;

export const Modal = ({ open, onClose, title, children, maxWidth = "max-w-md" }) => {
  const titleId = useRef(`modal-title-${++modalIdCounter}`).current;
  const dialogRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e) => { if (e.key === "Escape") onClose && onClose(); };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  // Move focus into the dialog when it opens, restore it to whatever
  // triggered the modal when it closes — standard dialog a11y behavior.
  useEffect(() => {
    if (open) {
      previouslyFocused.current = document.activeElement;
      const t = setTimeout(() => {
        const firstFocusable = dialogRef.current?.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        (firstFocusable || dialogRef.current)?.focus();
      }, 50);
      return () => clearTimeout(t);
    } else if (previouslyFocused.current) {
      previouslyFocused.current.focus?.();
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: "rgba(2,6,15,0.7)", backdropFilter: "blur(4px)" }}
          onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            onClick={e => e.stopPropagation()}
            className={`w-full ${maxWidth}`}>
            <GlassCard ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined}
              className="p-6 relative max-h-[85vh] overflow-y-auto outline-none">
              {onClose && (
                <button onClick={onClose} aria-label="Close dialog"
                  className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                  <Icon name="x" className="w-4 h-4" />
                </button>
              )}
              {title && <h3 id={titleId} className="font-black text-lg text-white mb-4 pr-8">{title}</h3>}
              {children}
            </GlassCard>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ── Empty State ──────────────────────────────────────────────
export const EmptyState = ({ icon = "info", title, subtitle, action }) => (
  <div className="flex flex-col items-center justify-center text-center py-14 px-6">
    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(0,196,255,0.08)" }}>
      <Icon name={icon} className="w-7 h-7 text-cyan-400" />
    </div>
    <p className="text-white font-semibold">{title}</p>
    {subtitle && <p className="text-slate-500 text-sm mt-1 max-w-xs">{subtitle}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

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