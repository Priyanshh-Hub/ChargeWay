import React, { useState, useEffect } from 'react';
import { api } from '../../api/api';
import { EMAIL_REGEX } from '../../constants/validation';
import { Modal, InputField, PasswordInput, Btn, Alert } from '../ui/index';

// No SMTP provider is wired up on the backend yet, so in development the
// API returns the reset link directly in the response instead of emailing
// it. This component reflects that: in dev it lets you jump straight to
// the reset step; in production the reset link would arrive by email
// and the user would land on this same "step 2" via a real link/route.
const isDev = import.meta.env?.DEV;

const ForgotPasswordModal = ({ open, onClose, initialEmail = "" }) => {
  const [step, setStep] = useState("request"); // request | sent | reset | done
  const [email, setEmail] = useState(initialEmail);
  const [devUrl, setDevUrl] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setStep("request"); setEmail(initialEmail); setError(""); setDevUrl("");
      setToken(""); setNewPassword(""); setConfirmPassword("");
    }
  }, [open, initialEmail]);

  const requestReset = async (e) => {
    e.preventDefault();
    if (!EMAIL_REGEX.test(email)) { setError("Enter a valid email address"); return; }
    setLoading(true); setError("");
    const res = await api.post("/auth/forgot-password", { email });
    setLoading(false);
    if (!res.ok) { setError(res.error || "Something went wrong."); return; }
    setStep("sent");
    if (res.data.devVerifyUrl || res.data.devResetUrl) {
      const url = res.data.devResetUrl;
      setDevUrl(url);
      const t = url?.split("/reset-password/")[1];
      if (t) setToken(t);
    }
  };

  const submitReset = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true); setError("");
    const res = await api.post("/auth/reset-password", { token, newPassword });
    setLoading(false);
    if (!res.ok) { setError(res.error || "Reset failed."); return; }
    setStep("done");
  };

  return (
    <Modal open={open} onClose={onClose} title={
      step === "request" ? "Reset your password" :
      step === "sent"    ? "Check your email" :
      step === "reset"   ? "Set a new password" : "Password updated"
    }>
      <Alert message={error} />

      {step === "request" && (
        <form onSubmit={requestReset} className="space-y-4 mt-1">
          <p className="text-sm text-slate-400">Enter the email on your account and we'll send you a link to reset your password.</p>
          <InputField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          <Btn type="submit" loading={loading} className="w-full">Send reset link</Btn>
        </form>
      )}

      {step === "sent" && (
        <div className="space-y-4 mt-1">
          <p className="text-sm text-slate-400">
            If an account exists for <span className="text-white font-medium">{email}</span>, a reset link is on its way.
          </p>
          {isDev && devUrl && (
            <div className="p-3 rounded-xl text-xs" style={{ background: "rgba(0,196,255,0.05)", border: "1px solid rgba(0,196,255,0.15)" }}>
              <p className="text-cyan-400 font-semibold mb-1">Dev mode — no email server configured</p>
              <p className="text-slate-400">Click below to simulate opening the reset link from your inbox.</p>
              <button type="button" onClick={() => setStep("reset")} className="text-cyan-400 underline mt-2 font-medium">
                Continue to reset password →
              </button>
            </div>
          )}
          <Btn variant="ghost" onClick={onClose} className="w-full">Close</Btn>
        </div>
      )}

      {step === "reset" && (
        <form onSubmit={submitReset} className="space-y-4 mt-1">
          <PasswordInput label="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} showStrength showRules required />
          <PasswordInput label="Confirm New Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
          <Btn type="submit" loading={loading} className="w-full">Update password</Btn>
        </form>
      )}

      {step === "done" && (
        <div className="space-y-4 mt-1 text-center">
          <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)" }}>
            <span className="text-green-400 text-xl">✓</span>
          </div>
          <p className="text-sm text-slate-300">Your password has been updated. You can sign in with your new password now.</p>
          <Btn onClick={onClose} className="w-full">Back to sign in</Btn>
        </div>
      )}
    </Modal>
  );
};

export default ForgotPasswordModal;
