import React from 'react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { api, setToken } from '../../api/api';
import { GlassCard, InputField, Btn, Alert } from '../ui/index';
import Icon from '../ui/Icon';

const Login = ({ onLogin, onNavigate }) => {
  const [form, setForm] = useState({ email: "", password: "", role: "User" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await api.post("/auth/login", form);
    if (res.ok) {
      setToken(res.data.token);
      onLogin(res.data.user);
    } else {
      setError(res.error || "Invalid credentials.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: "linear-gradient(135deg, #0066FF, #00C4FF)" }}>
            <Icon name="bolt" className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white">Welcome Back</h1>
          <p className="text-slate-400 mt-1 text-sm">Sign in to ChargeWay</p>
        </div>
        <GlassCard className="p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Alert message={error} />
            <InputField label="Email" type="email" value={form.email} onChange={f("email")} autoComplete="off" required />
            <InputField label="Password" type="password" value={form.password} onChange={f("password")} autoComplete="off" required />
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Login As</label>
              <select value={form.role} onChange={f("role")}
                className="w-full rounded-xl px-4 py-2.5 text-white text-sm outline-none border"
                style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }}>
                <option>User</option>
                <option>Station Manager</option>
                <option>Admin</option>
              </select>
            </div>
            <Btn type="submit" loading={loading} className="w-full mt-2">Sign In</Btn>
          </form>
          <div className="mt-5 pt-5 border-t border-white/5 text-center">
            <p className="text-slate-400 text-sm">
              No account?{" "}
              <button onClick={() => onNavigate("register")} className="text-cyan-400 font-semibold hover:text-cyan-300">
                Register
              </button>
            </p>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};

export default Login;
