import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../api/api';
import { GlassCard, Badge, Btn, Spinner } from '../ui/index';
import Icon from '../ui/Icon';

const AdminUsers = () => {
  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [selected,   setSelected]   = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [deleting,   setDeleting]   = useState(false);
  const [suspending, setSuspending] = useState(null); // userId being toggled

  const load = async () => {
    const res = await api.get("/users");
    if (res.ok) setUsers(res.data.users);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    if (!confirmDel) return;
    setDeleting(true);
    const res = await api.delete(`/users/${confirmDel._id}`);
    if (res.ok) {
      setUsers(prev => prev.filter(u => u._id !== confirmDel._id));
      setConfirmDel(null);
      setSelected(null);
    } else {
      alert(res.error || "Failed to delete user");
    }
    setDeleting(false);
  };

  const handleSuspend = async (u) => {
    setSuspending(u._id);
    const res = await api.put(`/users/${u._id}/suspend`, {});
    if (res.ok) {
      setUsers(prev => prev.map(x => x._id === u._id ? { ...x, isActive: res.data.user.isActive } : x));
      if (selected?._id === u._id) setSelected(prev => ({ ...prev, isActive: res.data.user.isActive }));
    } else {
      alert(res.error || "Failed to update user status");
    }
    setSuspending(null);
  };

  const roleColor = { Admin: "orange", "Station Manager": "purple", User: "blue" };
  const roleLabel = { "Station Manager": "Manager" };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-white">
          All Users <span className="text-slate-500 font-normal text-base">({users.length})</span>
        </h2>
        <div className="flex gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Active</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Suspended</span>
        </div>
      </div>

      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-white/10 text-xs uppercase tracking-wider">
                {["Name", "Email", "Role", "Status", "Phone", "Car", "Vehicle No", "Joined", "Actions"].map(h => (
                  <th key={h} className="p-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const suspended = !u.isActive;
                return (
                  <tr key={u._id}
                    className="border-b border-white/5 hover:bg-white/2 transition-colors"
                    style={{ opacity: suspended ? 0.65 : 1 }}>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
                          style={{ background: suspended ? "rgba(100,116,139,0.4)" : "linear-gradient(135deg,#0066FF,#00C4FF)" }}>
                          {u.name[0]}
                        </div>
                        <span className="text-white font-semibold">{u.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-400 text-xs">{u.email}</td>
                    <td className="p-4"><Badge color={roleColor[u.role] || "blue"}>{roleLabel[u.role] || u.role}</Badge></td>
                    <td className="p-4">
                      {suspended
                        ? <span className="text-xs font-bold text-red-400 bg-red-400/10 border border-red-400/20 px-2 py-0.5 rounded-full">Suspended</span>
                        : <span className="text-xs font-bold text-green-400 bg-green-400/10 border border-green-400/20 px-2 py-0.5 rounded-full">Active</span>
                      }
                    </td>
                    <td className="p-4 text-slate-400 text-xs">{u.phone || "—"}</td>
                    <td className="p-4 text-slate-300 text-xs">{u.car ? `${u.car.brand} ${u.car.model}` : "—"}</td>
                    <td className="p-4 font-mono text-xs text-slate-300">{u.car?.vehicleNumber || "—"}</td>
                    <td className="p-4 text-slate-500 text-xs">{u.joinDate ? new Date(u.joinDate).toLocaleDateString() : "—"}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {/* View Info */}
                        <button onClick={() => setSelected(u)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-cyan-400 hover:bg-cyan-400/10 border border-cyan-400/20 transition-all"
                          title="View Info">
                          <Icon name="info" className="w-4 h-4" />
                        </button>
                        {/* Suspend / Unsuspend */}
                        {u.role !== "Admin" && (
                          <button
                            onClick={() => handleSuspend(u)}
                            disabled={suspending === u._id}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all border"
                            style={{
                              color:       suspended ? "#10b981" : "#f59e0b",
                              background:  suspended ? "rgba(16,185,129,0.08)" : "rgba(245,158,11,0.08)",
                              borderColor: suspended ? "rgba(16,185,129,0.25)" : "rgba(245,158,11,0.25)",
                              opacity:     suspending === u._id ? 0.5 : 1,
                            }}
                            title={suspended ? "Unsuspend User" : "Suspend User"}>
                            {suspending === u._id ? "..." : suspended ? "✓" : "⏸"}
                          </button>
                        )}
                        {/* Delete */}
                        {u.role !== "Admin" && (
                          <button onClick={() => setConfirmDel(u)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-400/10 border border-red-400/20 transition-all"
                            title="Delete User">
                            <Icon name="x" className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* ── User Info Modal ── */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
            onClick={() => setSelected(null)}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              onClick={e => e.stopPropagation()} className="w-full max-w-md">
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-black text-white">User Details</h3>
                  <button onClick={() => setSelected(null)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 border border-white/10">
                    <Icon name="x" className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-4 mb-5">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black"
                    style={{ background: selected.isActive ? "linear-gradient(135deg,#0066FF,#00C4FF)" : "rgba(100,116,139,0.4)" }}>
                    {selected.name[0]}
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg">{selected.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge color={roleColor[selected.role] || "blue"}>{roleLabel[selected.role] || selected.role}</Badge>
                      {!selected.isActive && (
                        <span className="text-xs font-bold text-red-400 bg-red-400/10 border border-red-400/20 px-2 py-0.5 rounded-full">
                          Suspended
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-5">
                  {[
                    { l: "Email",   v: selected.email },
                    { l: "Phone",   v: selected.phone || "—" },
                    { l: "Status",  v: selected.isActive ? "Active ✅" : "Suspended 🚫" },
                    { l: "Joined",  v: selected.joinDate ? new Date(selected.joinDate).toLocaleDateString() : "—" },
                    { l: "User ID", v: selected._id, mono: true },
                  ].map(item => (
                    <div key={item.l} className="flex justify-between gap-2 py-2 border-b border-white/5">
                      <span className="text-slate-400 text-sm">{item.l}</span>
                      <span className={`text-right text-sm ${item.mono ? "font-mono text-xs text-slate-300" : "text-white font-medium"}`}>{item.v}</span>
                    </div>
                  ))}
                </div>

                {selected.car ? (
                  <div className="p-4 rounded-xl mb-5" style={{ background: "rgba(0,196,255,0.05)", border: "1px solid rgba(0,196,255,0.15)" }}>
                    <p className="text-cyan-400 font-semibold text-sm mb-2">🚗 Vehicle</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><p className="text-slate-400">Model</p><p className="text-white font-semibold">{selected.car.brand} {selected.car.model}</p></div>
                      <div><p className="text-slate-400">Plate</p><p className="text-white font-mono">{selected.car.vehicleNumber}</p></div>
                      <div><p className="text-slate-400">Battery</p><p className="text-white">{selected.car.battery_kwh} kWh</p></div>
                      <div><p className="text-slate-400">Range</p><p className="text-white">{selected.car.range_km} km</p></div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl mb-5 text-center text-slate-500 text-sm" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    No vehicle registered
                  </div>
                )}

                <div className="flex gap-3">
                  {/* Suspend/Unsuspend from modal */}
                  {selected.role !== "Admin" && (
                    <Btn
                      variant={selected.isActive ? "outline" : "success"}
                      onClick={() => handleSuspend(selected)}
                      loading={suspending === selected._id}
                      className="flex-1 gap-2">
                      {selected.isActive ? "⏸ Suspend" : "✓ Unsuspend"}
                    </Btn>
                  )}
                  {selected.role !== "Admin" && (
                    <Btn variant="danger" onClick={() => { setConfirmDel(selected); setSelected(null); }} className="flex-1 gap-2">
                      <Icon name="x" className="w-4 h-4" /> Delete
                    </Btn>
                  )}
                  <Btn variant="ghost" onClick={() => setSelected(null)} className="flex-1">Close</Btn>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirm Modal ── */}
      <AnimatePresence>
        {confirmDel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
            onClick={() => setConfirmDel(null)}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              onClick={e => e.stopPropagation()} className="w-full max-w-sm">
              <GlassCard className="p-6 text-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: "rgba(239,68,68,0.15)", border: "2px solid rgba(239,68,68,0.3)" }}>
                  <Icon name="x" className="w-7 h-7 text-red-400" />
                </div>
                <h3 className="text-lg font-black text-white mb-1">Delete User?</h3>
                <p className="text-slate-400 text-sm mb-1">
                  Are you sure you want to delete <span className="text-white font-semibold">{confirmDel.name}</span>?
                </p>
                <p className="text-red-400 text-xs mb-6">This will cancel all their upcoming bookings and cannot be undone.</p>
                <div className="flex gap-3">
                  <Btn variant="ghost" onClick={() => setConfirmDel(null)} className="flex-1">Cancel</Btn>
                  <Btn variant="danger" onClick={handleDelete} loading={deleting} className="flex-1">Yes, Delete</Btn>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminUsers;