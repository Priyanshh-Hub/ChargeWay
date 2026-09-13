import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { api, setToken } from '../../api/api';

const CONFIGURED = !!(import.meta.env?.VITE_GOOGLE_CLIENT_ID);

/**
 * Drop-in replacement for the disabled "Google" button previously in
 * Login.jsx / Register.jsx. Renders the real Google button when
 * VITE_GOOGLE_CLIENT_ID is set (see Frontend/.env.example); otherwise
 * falls back to the same disabled "Coming soon" button as before, so
 * nothing breaks for anyone who hasn't set up OAuth credentials yet.
 *
 * Props:
 *   onAuthed(user)  — called with the logged-in/registered user on success
 *   role            — optional role to attach for first-time Google signups
 */
export default function GoogleAuthButton({ onAuthed, role, onError }) {
  const [loading, setLoading] = useState(false);

  if (!CONFIGURED) {
    return (
      <button type="button" disabled title="Google Sign-In needs GOOGLE_CLIENT_ID configured"
        className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border border-white/10 text-slate-500 cursor-not-allowed opacity-60 w-full">
        Google
      </button>
    );
  }

  const handleSuccess = async (credentialResponse) => {
    setLoading(true);
    const res = await api.post('/auth/google', { idToken: credentialResponse.credential, role });
    setLoading(false);
    if (res.ok) {
      setToken(res.data.token);
      onAuthed(res.data.user);
    } else {
      onError?.(res.error || 'Google sign-in failed. Please try again.');
    }
  };

  return (
    <div className={loading ? 'opacity-60 pointer-events-none' : ''}>
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => onError?.('Google sign-in failed. Please try again.')}
        theme="filled_black"
        shape="pill"
        size="medium"
        width="100%"
      />
    </div>
  );
}
