import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { api, setToken } from '../../api/api';
import { EMAIL_REGEX } from '../../constants/validation';
import { GlassCard, InputField, PasswordInput, Checkbox, Btn, Alert } from '../ui/index';
import Icon from '../ui/Icon';
import Logo from '../ui/Logo';
import ForgotPasswordModal from './ForgotPasswordModal';

const REMEMBER_EMAIL_KEY = "cw_remember_email";

// Friendly, specific copy for known backend error codes.
const ERROR_COPY = {
  INVALID_CREDENTIALS: "The email or password you entered is incorrect. Please try again.",
  ROLE_MISMATCH: "We couldn't find that account under this role. Try a different role tab.",
  ACCOUNT_SUSPENDED: "This account has been suspended. Contact support for help.",
  MISSING_FIELDS: "Please fill in both your email and password.",
};

const BENEFITS = [
  { icon: "stations", title: "Find & book instantly",   sub: "Live availability across every partner station." },
  { icon: "battery",  title: "Monitor every session",    sub: "Track charge speed, cost, and time in real time." },
  { icon: "invoices", title: "Automatic invoices",       sub: "GST-ready receipts for every charge, always on hand." },
  { icon: "shield",   title: "Lower your carbon footprint", sub: "See exactly how much CO₂ you're saving as you go." },
];

const Login = ({ onLogin, onNavigate }) => {
  const [form, setForm] = useState({ email: "", password: "", role: "User" });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (saved) {
      setForm(p => ({ ...p, email: saved }));
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (cooldown <= 0) { clearInterval(cooldownRef.current); return; }
    cooldownRef.current = setInterval(() => setCooldown(c => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(cooldownRef.current);
  }, [cooldown]);

  const f = (k) => (e) => {
    setForm(p => ({ ...p, [k]: e.target.value }));
    if (fieldErrors[k]) setFieldErrors(p => ({ ...p, [k]: undefined }));
    if (error) setError("");
  };

  const validate = () => {
    const e = {};
    if (!form.email.trim()) e.email = "Email is required";
    else if (!EMAIL_REGEX.test(form.email)) e.email = "Enter a valid email address";
    if (!form.password) e.password = "Password is required";
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cooldown > 0) return;
    if (!validate()) return;

    setLoading(true); setError("");
    const res = await api.post("/auth/login", { ...form, rememberMe });

    if (res.ok) {
      if (rememberMe) localStorage.setItem(REMEMBER_EMAIL_KEY, form.email);
      else localStorage.removeItem(REMEMBER_EMAIL_KEY);
      setToken(res.data.token);
      onLogin(res.data.user);
    } else if (res.status === 429) {
      setCooldown(res.retryAfter || 60);
      setError(res.error);
    } else {
      setError(ERROR_COPY[res.code] || res.error || "Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-stretch">
      {/* Left panel — product pitch, hidden on small screens */}
      <div className="hidden lg:flex lg:w-[46%] flex-col justify-center px-16 py-12 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, #0066FF, transparent 70%)" }} />

        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} className="relative max-w-md">
          <Logo size="lg" className="mb-8" />
          <h1 className="text-4xl font-black text-white leading-tight mb-4">
            The smarter way<br />to charge your EV.
          </h1>
          <p className="text-slate-400 text-base leading-relaxed mb-10">
            Book charging stations, monitor live sessions, track invoices, and
            reduce your carbon footprint — all from one place.
          </p>

          <div className="space-y-5">
            {BENEFITS.map(b => (
              <div key={b.title} className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: "rgba(0,196,255,0.1)" }}>
                  <Icon name={b.icon} className="w-4.5 h-4.5 text-cyan-400" style={{ width: 18, height: 18 }} />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{b.title}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{b.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-4 py-10">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="text-center mb-8 lg:hidden">
            <Logo size="md" className="mb-4 justify-center" />
          </div>
          <div className="text-center mb-8">
            <h1 className="text-hero text-white">Welcome back</h1>
            <p className="text-slate-400 mt-1 text-sm">Sign in to continue to your dashboard</p>
          </div>

          <GlassCard className="p-8">
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <Alert message={error} />
              {cooldown > 0 && (
                <Alert type="warning" message={`Too many attempts. Try again in ${cooldown}s.`} />
              )}

              <InputField
                label="Email" type="email" value={form.email} onChange={f("email")}
                error={fieldErrors.email} autoComplete="email" placeholder="you@example.com" required
              />
              <div>
                <PasswordInput
                  label="Password" value={form.password} onChange={f("password")}
                  error={fieldErrors.password} autoComplete="current-password" placeholder="Enter your password" required
                />
                <div className="text-right mt-1.5">
                  <button type="button" onClick={() => setForgotOpen(true)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-medium">
                    Forgot password?
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Login as</label>
                <select value={form.role} onChange={f("role")}
                  className="w-full rounded-xl px-4 py-2.5 text-white text-sm outline-none border"
                  style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }}>
                  <option>User</option>
                  <option>Station Manager</option>
                  <option>Admin</option>
                </select>
              </div>

              <Checkbox checked={rememberMe} onChange={setRememberMe} label="Remember me on this device" id="remember-me" />

              <Btn type="submit" loading={loading} disabled={cooldown > 0} className="w-full mt-2">
                {cooldown > 0 ? `Try again in ${cooldown}s` : loading ? "Signing you in..." : "Continue to Dashboard →"}
              </Btn>
            </form>

            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-slate-500">or continue with</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" disabled title="Coming soon"
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border border-white/10 text-slate-500 cursor-not-allowed opacity-60">
                Google
              </button>
              <button type="button" disabled title="Coming soon"
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border border-white/10 text-slate-500 cursor-not-allowed opacity-60">
                Apple
              </button>
            </div>

            <div className="mt-5 pt-5 border-t border-white/5 text-center">
              <p className="text-slate-400 text-sm">
                Don't have an account?{" "}
                <button onClick={() => onNavigate("register")} className="text-cyan-400 font-semibold hover:text-cyan-300">
                  Sign up
                </button>
              </p>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      <ForgotPasswordModal open={forgotOpen} onClose={() => setForgotOpen(false)} initialEmail={form.email} />
    </div>
  );
};

export default Login;
