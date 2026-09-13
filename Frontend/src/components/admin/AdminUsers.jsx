import toast from 'react-hot-toast';
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

  // Search / filter
  const [search,     setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState("All");

  // Pagination
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);

  // Bulk selection
  const [checked, setChecked] = useState(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState(null); // "suspend" | "delete" | null

  const load = async () => {
    const res = await api.get("/users");
    if (res.ok) setUsers(res.data.users);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = users.filter(u => {
    const matchesSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "All" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });
  useEffect(() => { setPage(1); }, [search, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageUsers = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageSelectableIds = pageUsers.filter(u => u.role !== "Admin").map(u => u._id);
  const allPageChecked = pageSelectableIds.length > 0 && pageSelectableIds.every(id => checked.has(id));

  const toggleOne = (id) => setChecked(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const toggleAllOnPage = () => setChecked(prev => {
    const next = new Set(prev);
    if (allPageChecked) pageSelectableIds.forEach(id => next.delete(id));
    else pageSelectableIds.forEach(id => next.add(id));
    return next;
  });

  const runBulkSuspend = async () => {
    setBulkBusy(true);
    const ids = [...checked];
    await Promise.all(ids.map(id => api.put(`/users/${id}/suspend`, {})));
    await load();
    setChecked(new Set());
    setBulkConfirm(null);
    setBulkBusy(false);
    toast.success(`Updated ${ids.length} user${ids.length === 1 ? "" : "s"}`);
  };

  const runBulkDelete = async () => {
    setBulkBusy(true);
    const ids = [...checked];
    const results = await Promise.all(ids.map(id => api.delete(`/users/${id}`)));
    const failed = results.filter(r => !r.ok).length;
    await load();
    setChecked(new Set());
    setBulkConfirm(null);
    setBulkBusy(false);
    if (failed > 0) toast.error(`${failed} of ${ids.length} deletions failed`);
    else toast.success(`Deleted ${ids.length} user${ids.length === 1 ? "" : "s"}`);
  };

  const handleDelete = async () => {
    if (!confirmDel) return;
    setDeleting(true);
    const res = await api.delete(`/users/${confirmDel._id}`);
    if (res.ok) {
      setUsers(prev => prev.filter(u => u._id !== confirmDel._id));
      setConfirmDel(null);
      setSelected(null);
    } else {
      toast.error(res.error || "Failed to delete user");
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
      toast.error(res.error || "Failed to update user status");
    }
    setSuspending(null);
  };

  const roleColor = { Admin: "orange", "Station Manager": "purple", User: "blue" };
  const roleLabel = { "Station Manager": "Manager" };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-page text-white">
          All Users <span className="text-slate-500 font-normal text-base">({filtered.length})</span>
        </h2>
        <div className="flex gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Active</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Suspended</span>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Icon name="search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email..."
            className="w-full pl-9 pr-3 py-2 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF8A3D]/50" />
        </div>
        <div className="flex gap-2">
          {["All", "User", "Station Manager", "Admin"].map(r => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
              style={{
                background:  roleFilter === r ? "rgba(255,138,61,0.15)" : "rgba(255,255,255,0.03)",
                borderColor: roleFilter === r ? "rgba(255,138,61,0.4)" : "rgba(255,255,255,0.08)",
                color:       roleFilter === r ? "#FF8A3D" : "#94a3b8",
              }}>
              {r === "Station Manager" ? "Manager" : r}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk action bar */}
      <AnimatePresence>
        {checked.size > 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl flex-wrap"
            style={{ background: "rgba(255,138,61,0.08)", border: "1px solid rgba(255,138,61,0.2)" }}>
            <p className="text-sm text-white font-medium">{checked.size} user{checked.size === 1 ? "" : "s"} selected</p>
            <div className="flex gap-2">
              <Btn variant="outline" className="text-xs" onClick={() => setBulkConfirm("suspend")}>Toggle Suspend</Btn>
              <Btn variant="danger" className="text-xs" onClick={() => setBulkConfirm("delete")}>Delete Selected</Btn>
              <Btn variant="ghost" className="text-xs" onClick={() => setChecked(new Set())}>Clear</Btn>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-white/10 text-xs uppercase tracking-wider">
                <th className="p-4 font-medium w-10">
                  <input type="checkbox" checked={allPageChecked} onChange={toggleAllOnPage}
                    className="w-4 h-4 rounded accent-[#FF8A3D]" />
                </th>
                {["Name", "Email", "Role", "Status", "Phone", "Car", "Vehicle No", "Joined", "Actions"].map(h => (
                  <th key={h} className="p-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageUsers.length === 0 && (
                <tr><td colSpan={10} className="p-10 text-center text-slate-500 text-sm">No users match your search.</td></tr>
              )}
              {pageUsers.map(u => {
                const suspended = !u.isActive;
                return (
                  <tr key={u._id}
                    className="border-b border-white/5 hover:bg-white/2 transition-colors"
                    style={{ opacity: suspended ? 0.65 : 1 }}>
                    <td className="p-4">
                      {u.role !== "Admin" && (
                        <input type="checkbox" checked={checked.has(u._id)} onChange={() => toggleOne(u._id)}
                          className="w-4 h-4 rounded accent-[#FF8A3D]" />
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
                          style={{ background: suspended ? "rgba(100,116,139,0.4)" : "linear-gradient(135deg,#5B47E0,#FF8A3D)" }}>
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
                    <td className="p-4 cw-figure text-xs text-slate-300">{u.car?.vehicleNumber || "—"}</td>
                    <td className="p-4 text-slate-500 text-xs">{u.joinDate ? new Date(u.joinDate).toLocaleDateString() : "—"}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {/* View Info */}
                        <button onClick={() => setSelected(u)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#FF8A3D] hover:bg-[#FF8A3D]/10 border border-[#FF8A3D]/20 transition-all"
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <p className="text-xs text-slate-500">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent">‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .map((p, i, arr) => (
                  <React.Fragment key={p}>
                    {i > 0 && arr[i - 1] !== p - 1 && <span className="text-slate-600 px-1">…</span>}
                    <button onClick={() => setPage(p)}
                      className="w-8 h-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-all"
                      style={p === page ? { background: "rgba(255,138,61,0.15)", color: "#FF8A3D" } : { color: "#64748b" }}>
                      {p}
                    </button>
                  </React.Fragment>
                ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent">›</button>
            </div>
          </div>
        )}
      </GlassCard>

      {/* ── Bulk action confirm modal ── */}
      <AnimatePresence>
        {bulkConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
            onClick={() => !bulkBusy && setBulkConfirm(null)}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              onClick={e => e.stopPropagation()} className="w-full max-w-sm">
              <GlassCard className="p-6 text-center">
                <h3 className="text-lg font-black text-white mb-1">
                  {bulkConfirm === "delete" ? "Delete" : "Toggle suspend for"} {checked.size} user{checked.size === 1 ? "" : "s"}?
                </h3>
                <p className="text-slate-400 text-sm mb-6">
                  {bulkConfirm === "delete"
                    ? "This cancels their upcoming bookings and cannot be undone."
                    : "Active users will be suspended; suspended users will be reactivated."}
                </p>
                <div className="flex gap-3">
                  <Btn variant="ghost" onClick={() => setBulkConfirm(null)} className="flex-1" disabled={bulkBusy}>Cancel</Btn>
                  <Btn variant="danger" onClick={bulkConfirm === "delete" ? runBulkDelete : runBulkSuspend} loading={bulkBusy} className="flex-1">
                    Confirm
                  </Btn>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                    style={{ background: selected.isActive ? "linear-gradient(135deg,#5B47E0,#FF8A3D)" : "rgba(100,116,139,0.4)" }}>
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
                  <div className="p-4 rounded-xl mb-5" style={{ background: "rgba(255,138,61,0.05)", border: "1px solid rgba(255,138,61,0.15)" }}>
                    <p className="text-[#FF8A3D] font-semibold text-sm mb-2">🚗 Vehicle</p>
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