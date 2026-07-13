import React, { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { api } from '../../api/api';
import { GlassCard, Btn, Alert, PasswordInput, Modal } from '../ui/index';
import Icon from '../ui/Icon';

const ProfilePage = ({ user, onUserUpdate, setActiveView, onLogout }) => {
  const [editMode, setEditMode]   = useState(false);
  const [name, setName]           = useState(user.name || '');
  const [phone, setPhone]         = useState(user.phone || '');
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState('');
  const [error, setError]         = useState('');

  // Password change
  const [showPwd, setShowPwd]         = useState(false);
  const [currentPwd, setCurrentPwd]   = useState('');
  const [newPwd, setNewPwd]           = useState('');
  const [confirmPwd, setConfirmPwd]   = useState('');
  const [pwdLoading, setPwdLoading]   = useState(false);
  const [pwdSuccess, setPwdSuccess]   = useState('');
  const [pwdError, setPwdError]       = useState('');

  // Preferences
  const [prefs, setPrefs] = useState({
    emailNotifications: user.preferences?.emailNotifications ?? true,
    smsNotifications:   user.preferences?.smsNotifications ?? false,
    promotions:         user.preferences?.promotions ?? true,
  });
  const [prefsLoading, setPrefsLoading] = useState(false);

  // Delete account
  const [deleteOpen, setDeleteOpen]       = useState(false);
  const [deletePwd, setDeletePwd]         = useState('');
  const [deleteError, setDeleteError]     = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const initials = user.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  const roleColor = {
    'User':            { bg: 'rgba(0,196,255,0.15)',   border: 'rgba(0,196,255,0.4)',   text: '#00C4FF'  },
    'Station Manager': { bg: 'rgba(99,102,241,0.15)',  border: 'rgba(99,102,241,0.4)',  text: '#818cf8'  },
    'Admin':           { bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.4)',   text: '#f87171'  },
  }[user.role] || { bg: 'rgba(0,196,255,0.15)', border: 'rgba(0,196,255,0.4)', text: '#00C4FF' };

  const handleSave = async () => {
    setLoading(true); setError(''); setSuccess('');
    const res = await api.put('/user/profile', { name, phone });
    if (res.ok) {
      onUserUpdate(res.data.user);
      setSuccess('Profile updated successfully! ✅');
      setEditMode(false);
    } else {
      setError(res.error || 'Failed to update profile');
    }
    setLoading(false);
  };

  const handlePasswordChange = async () => {
    setPwdError(''); setPwdSuccess('');
    if (!currentPwd || !newPwd || !confirmPwd) return setPwdError('All fields are required');
    if (newPwd !== confirmPwd) return setPwdError('New passwords do not match');
    if (newPwd.length < 8) return setPwdError('Password must be at least 8 characters');
    setPwdLoading(true);
    const res = await api.put('/user/password', { currentPassword: currentPwd, newPassword: newPwd });
    if (res.ok) {
      setPwdSuccess('Password changed successfully! 🔒');
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
      setShowPwd(false);
    } else {
      setPwdError(res.error || 'Failed to change password');
    }
    setPwdLoading(false);
  };

  const togglePref = async (key) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setPrefsLoading(true);
    const res = await api.put('/user/preferences', next);
    if (res.ok) { onUserUpdate(res.data.user); toast.success('Preferences updated'); }
    else { setPrefs(prefs); toast.error(res.error || 'Failed to update preferences'); }
    setPrefsLoading(false);
  };

  const handleDeleteAccount = async () => {
    if (!deletePwd) { setDeleteError('Enter your password to confirm'); return; }
    setDeleteLoading(true); setDeleteError('');
    const res = await api.delete('/user/me', { password: deletePwd });
    setDeleteLoading(false);
    if (res.ok) {
      toast.success('Account deleted. Sorry to see you go.');
      if (onLogout) onLogout();
    } else {
      setDeleteError(res.error || 'Failed to delete account');
    }
  };

  const pwdsMatch = confirmPwd.length > 0 && newPwd === confirmPwd;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-black text-white">My Profile</h2>
        <p className="text-slate-400 text-sm mt-1">Manage your account information</p>
      </motion.div>

      {/* Avatar + Role Card */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black text-white shrink-0"
            style={{ background: "linear-gradient(135deg,#0066FF,#00C4FF)" }}>
            {initials}
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-black text-white">{user.name}</h3>
            <p className="text-slate-400 text-sm mt-0.5">{user.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold"
                style={{ background: roleColor.bg, border: `1px solid ${roleColor.border}`, color: roleColor.text }}>
                {user.role}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500/10 border border-green-500/30 text-green-400">
                ● Active
              </span>
            </div>
          </div>
          <button onClick={() => { setEditMode(!editMode); setSuccess(''); setError(''); }}
            className="px-4 py-2 rounded-xl text-sm font-semibold border transition-all"
            style={{ background: editMode ? 'rgba(239,68,68,0.1)' : 'rgba(0,196,255,0.1)', borderColor: editMode ? 'rgba(239,68,68,0.3)' : 'rgba(0,196,255,0.3)', color: editMode ? '#f87171' : '#00C4FF' }}>
            {editMode ? 'Cancel' : '✏️ Edit'}
          </button>
        </div>
      </GlassCard>

      {/* Profile Info */}
      <GlassCard className="p-6">
        <h3 className="font-bold text-slate-300 mb-5 text-lg">Account Information</h3>

        {success && <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm">{success}</div>}
        {error   && <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1.5 block">Full Name</label>
            {editMode ? (
              <input value={name} onChange={e => setName(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-white outline-none border transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(0,196,255,0.4)' }} />
            ) : (
              <div className="px-4 py-3 rounded-xl text-white" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {user.name}
              </div>
            )}
          </div>

          {/* Email — always readonly */}
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1.5 block">Email Address</label>
            <div className="px-4 py-3 rounded-xl text-slate-400 flex items-center justify-between"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {user.email}
              <span className="text-xs text-slate-600 bg-slate-800 px-2 py-0.5 rounded-lg">Read only</span>
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1.5 block">Phone Number</label>
            {editMode ? (
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Enter phone number"
                className="w-full rounded-xl px-4 py-3 text-white outline-none border transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(0,196,255,0.4)' }} />
            ) : (
              <div className="px-4 py-3 rounded-xl text-white" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {user.phone || <span className="text-slate-500">Not provided</span>}
              </div>
            )}
          </div>

          {/* Role — readonly */}
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1.5 block">Role</label>
            <div className="px-4 py-3 rounded-xl text-slate-400 flex items-center justify-between"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {user.role}
              <span className="text-xs text-slate-600 bg-slate-800 px-2 py-0.5 rounded-lg">Read only</span>
            </div>
          </div>
        </div>

        {editMode && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5">
            <Btn onClick={handleSave} loading={loading} className="w-full">
              Save Changes
            </Btn>
          </motion.div>
        )}
      </GlassCard>

      {/* Change Password */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-slate-300 text-lg">Security</h3>
            <p className="text-slate-500 text-xs mt-0.5">Change your password</p>
          </div>
          <button onClick={() => { setShowPwd(!showPwd); setPwdError(''); setPwdSuccess(''); }}
            className="px-4 py-2 rounded-xl text-sm font-semibold border transition-all"
            style={{ background: showPwd ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)', borderColor: showPwd ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)', color: showPwd ? '#f87171' : '#94a3b8' }}>
            {showPwd ? 'Cancel' : '🔒 Change Password'}
          </button>
        </div>

        {pwdSuccess && <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm">{pwdSuccess}</div>}
        {pwdError   && <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{pwdError}</div>}

        {showPwd && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <PasswordInput label="Current Password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} autoComplete="current-password" />
            <PasswordInput label="New Password" value={newPwd} onChange={e => setNewPwd(e.target.value)} autoComplete="new-password" showStrength showRules />
            <PasswordInput label="Confirm New Password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} autoComplete="new-password"
              error={confirmPwd.length > 0 && !pwdsMatch ? "Passwords do not match" : undefined} />

            <Btn onClick={handlePasswordChange} loading={pwdLoading} className="w-full mt-2">
              Update Password
            </Btn>
          </motion.div>
        )}
      </GlassCard>

      {/* My Vehicles quick link */}
      {user.role === "User" && setActiveView && (
        <GlassCard className="p-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,196,255,0.1)" }}>
              <Icon name="car" className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-300">My Vehicles</h3>
              <p className="text-slate-500 text-xs mt-0.5">Manage vehicles linked to your account</p>
            </div>
          </div>
          <Btn variant="outline" onClick={() => setActiveView("vehicles")}>Manage →</Btn>
        </GlassCard>
      )}

      {/* Notification Preferences */}
      <GlassCard className="p-6">
        <h3 className="font-bold text-slate-300 text-lg mb-1">Notification Preferences</h3>
        <p className="text-slate-500 text-xs mb-5">Choose what ChargeWay can contact you about</p>
        <div className="space-y-3">
          {[
            { key: "emailNotifications", label: "Email notifications", sub: "Booking confirmations, receipts, and account alerts" },
            { key: "smsNotifications",   label: "SMS notifications",   sub: "Charging status and time-sensitive alerts" },
            { key: "promotions",         label: "Offers & promotions", sub: "Occasional discounts and product updates" },
          ].map(p => (
            <div key={p.key} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div>
                <p className="text-sm font-semibold text-white">{p.label}</p>
                <p className="text-xs text-slate-500">{p.sub}</p>
              </div>
              <button onClick={() => togglePref(p.key)} disabled={prefsLoading}
                className="w-11 h-6 rounded-full relative transition-all flex-shrink-0"
                style={{ background: prefs[p.key] ? "linear-gradient(135deg,#0066FF,#00C4FF)" : "rgba(255,255,255,0.1)" }}
                aria-pressed={prefs[p.key]} role="switch">
                <motion.span className="absolute top-1 w-4 h-4 rounded-full bg-white"
                  animate={{ left: prefs[p.key] ? 22 : 4 }} transition={{ duration: 0.15 }} />
              </button>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Account Stats */}
      <GlassCard className="p-6">
        <h3 className="font-bold text-slate-300 mb-4 text-lg">Account Details</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { l: 'Member Since', v: user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'N/A' },
            { l: 'Account Status', v: 'Active ✅' },
            { l: 'Role', v: user.role },
            { l: 'User ID', v: user._id?.slice(-8).toUpperCase() || 'N/A' },
          ].map(item => (
            <div key={item.l} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xs text-slate-500 mb-1">{item.l}</p>
              <p className="text-sm font-semibold text-white">{item.v}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Danger Zone */}
      <GlassCard className="p-6" style={{ borderColor: "rgba(239,68,68,0.2)" }}>
        <h3 className="font-bold text-red-400 text-lg mb-1">Danger Zone</h3>
        <p className="text-slate-500 text-xs mb-4">Deleting your account is permanent and cannot be undone. All your bookings, vehicles, and invoices will be removed.</p>
        <Btn variant="danger" onClick={() => setDeleteOpen(true)}>Delete My Account</Btn>
      </GlassCard>

      <Modal open={deleteOpen} onClose={() => { setDeleteOpen(false); setDeletePwd(''); setDeleteError(''); }} title="Delete your account?">
        <Alert message={deleteError} />
        <p className="text-sm text-slate-400 mb-4">This can't be undone. Enter your password to confirm you want to permanently delete your ChargeWay account.</p>
        <PasswordInput label="Password" value={deletePwd} onChange={e => setDeletePwd(e.target.value)} placeholder="Enter your password" />
        <div className="flex gap-3 mt-5">
          <Btn variant="ghost" onClick={() => setDeleteOpen(false)} className="flex-1">Cancel</Btn>
          <Btn variant="danger" onClick={handleDeleteAccount} loading={deleteLoading} className="flex-1">Delete Permanently</Btn>
        </div>
      </Modal>

    </div>
  );
};

export default ProfilePage;