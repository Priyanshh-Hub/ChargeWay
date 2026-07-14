import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, serverImg } from '../../api/api';
import { GlassCard, Badge, Btn, Spinner } from '../ui/index';
import Icon from '../ui/Icon';

const COMMON_FACILITIES = [
  "WiFi", "Restroom", "Parking", "CCTV", "Cafeteria",
  "Air Conditioning", "Waiting Area", "EV Shop", "Car Wash", "Security Guard"
];

const AdminStations = () => {
  const [stations,   setStations]   = useState([]);
  const [managers,   setManagers]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [selected,   setSelected]   = useState(null);
  const [editTarget, setEditTarget] = useState(null); // station being edited
  const [confirmDel, setConfirmDel] = useState(null);
  const [deleting,   setDeleting]   = useState(false);

  // Edit form state
  const [editForm,    setEditForm]    = useState({});
  const [facilities,  setFacilities]  = useState([]);
  const [newFacility, setNewFacility] = useState('');
  const [saving,      setSaving]      = useState(false);
  const [saveMsg,     setSaveMsg]     = useState('');

  const load = async () => {
    const [stRes, usRes] = await Promise.all([
      api.get("/stations"),
      api.get("/users"),
    ]);
    if (stRes.ok) setStations(stRes.data.stations);
    if (usRes.ok) setManagers((usRes.data.users || []).filter(u => u.role === "Station Manager"));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openEdit = (s) => {
    setEditForm({
      name:          s.name,
      address:       s.address,
      lat:           s.lat,
      lng:           s.lng,
      price_per_kwh: s.price_per_kwh,
      status:        s.status,
      managerId:     s.managerId?._id || s.managerId || '',
    });
    setFacilities(s.facilities || []);
    setSaveMsg('');
    setEditTarget(s);
    setSelected(null);
  };

  const handleSave = async () => {
    if (!editForm.managerId) {
      setSaveMsg('❌ Every station must have a manager assigned.');
      return;
    }
    setSaving(true); setSaveMsg('');
    const payload = {
      ...editForm,
      lat:           parseFloat(editForm.lat),
      lng:           parseFloat(editForm.lng),
      price_per_kwh: parseFloat(editForm.price_per_kwh),
      facilities,
      managerId:     editForm.managerId,
    };
    const res = await api.put(`/stations/${editTarget._id}/edit`, payload);
    if (res.ok) {
      setStations(prev => prev.map(s => s._id === editTarget._id ? res.data.station : s));
      setSaveMsg('✅ Station updated!');
      setTimeout(() => { setSaveMsg(''); setEditTarget(null); }, 1500);
    } else {
      setSaveMsg('❌ ' + (res.error || 'Failed to save'));
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirmDel) return;
    setDeleting(true);
    const res = await api.delete(`/stations/${confirmDel._id}`);
    if (res.ok) {
      setStations(prev => prev.filter(s => s._id !== confirmDel._id));
      setConfirmDel(null); setSelected(null);
    } else {
      toast.error(res.error || "Failed to delete station");
    }
    setDeleting(false);
  };

  const toggleFacility = (f) =>
    setFacilities(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);

  const addCustomFacility = () => {
    const f = newFacility.trim();
    if (f && !facilities.includes(f)) { setFacilities(prev => [...prev, f]); setNewFacility(''); }
  };

  const field = (label, key, type = "text", placeholder = "") => (
    <div>
      <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1.5 block">{label}</label>
      <input type={type} value={editForm[key] ?? ''} placeholder={placeholder}
        onChange={e => setEditForm(p => ({ ...p, [key]: e.target.value }))}
        className="w-full rounded-xl px-4 py-2.5 text-white text-sm outline-none border transition-all"
        style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(0,196,255,0.3)" }} />
    </div>
  );

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black text-white">
        All Stations <span className="text-slate-500 font-normal text-base">({stations.length})</span>
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {stations.map(s => {
          const avail = s.chargers?.filter(c => c.status === "Available").length  || 0;
          const charg = s.chargers?.filter(c => c.status === "Charging").length   || 0;
          const maint = s.chargers?.filter(c => c.status === "Maintenance").length || 0;
          return (
            <GlassCard key={s._id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white truncate">{s.name}</h3>
                  <p className="text-slate-400 text-xs mt-0.5 truncate">{s.address}</p>
                  {s.managerId
                    ? <p className="text-xs text-cyan-400 mt-0.5">👤 {s.managerId.name || s.managerId}</p>
                    : <p className="text-xs text-yellow-400 mt-0.5">⚠ No manager assigned</p>
                  }
                </div>
                <Badge color={s.status === "Online" ? "green" : "red"}>{s.status}</Badge>
              </div>

              {s.image && (
                <img src={serverImg(s.image)} alt={s.name} className="w-full h-24 object-cover rounded-xl mb-3"
                  onError={e => { e.target.style.display = "none"; }} />
              )}

              <div className="grid grid-cols-4 gap-2 text-center text-xs mb-4">
                {[
                  { l: "Total",    v: s.chargers?.length || 0, c: "#94a3b8" },
                  { l: "Avail",    v: avail,                   c: "#10b981" },
                  { l: "Charging", v: charg,                   c: "#60a5fa" },
                  { l: "Maint",    v: maint,                   c: "#fbbf24" },
                ].map(i => (
                  <div key={i.l} className="p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <p className="font-bold" style={{ color: i.c }}>{i.v}</p>
                    <p className="text-slate-500">{i.l}</p>
                  </div>
                ))}
              </div>

              <div className="flex justify-between text-xs text-slate-400 mb-4">
                <span>₹{s.price_per_kwh}/kWh</span>
                <span className="font-mono text-slate-600">{s.lat?.toFixed(4)}, {s.lng?.toFixed(4)}</span>
              </div>

              <div className="flex gap-2 pt-3 border-t border-white/5">
                <Btn variant="outline" onClick={() => setSelected(s)} className="flex-1 gap-1.5 text-xs py-2">
                  <Icon name="info" className="w-3.5 h-3.5" /> View
                </Btn>
                <Btn variant="outline" onClick={() => openEdit(s)} className="flex-1 gap-1.5 text-xs py-2"
                  style={{ borderColor: "rgba(0,196,255,0.3)", color: "#00C4FF" }}>
                  ✏️ Edit
                </Btn>
                <Btn variant="danger" onClick={() => setConfirmDel(s)} className="flex-1 gap-1.5 text-xs py-2">
                  <Icon name="x" className="w-3.5 h-3.5" /> Delete
                </Btn>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* ── View Info Modal ── */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
            onClick={() => setSelected(null)}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              onClick={e => e.stopPropagation()} className="w-full max-w-lg">
              <GlassCard className="p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-black text-white">Station Details</h3>
                  <button onClick={() => setSelected(null)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 border border-white/10">
                    <Icon name="x" className="w-4 h-4" />
                  </button>
                </div>

                {selected.image && (
                  <img src={serverImg(selected.image)} alt={selected.name}
                    className="w-full h-36 object-cover rounded-xl mb-4"
                    onError={e => { e.target.style.display = "none"; }} />
                )}

                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-white font-black text-xl">{selected.name}</h4>
                    <p className="text-slate-400 text-sm">{selected.address}</p>
                  </div>
                  <Badge color={selected.status === "Online" ? "green" : "red"}>{selected.status}</Badge>
                </div>

                <div className="space-y-2 mb-4">
                  {[
                    { l: "Station ID", v: selected._id,                                    mono: true  },
                    { l: "Manager",    v: selected.managerId?.name || "⚠ Unassigned",      mono: false },
                    { l: "Price",      v: `₹${selected.price_per_kwh}/kWh`,                mono: false },
                    { l: "Latitude",   v: selected.lat,                                    mono: true  },
                    { l: "Longitude",  v: selected.lng,                                    mono: true  },
                  ].map(item => (
                    <div key={item.l} className="flex justify-between gap-2 py-2 border-b border-white/5">
                      <span className="text-slate-400 text-sm">{item.l}</span>
                      <span className={`text-right text-sm ${item.mono ? "font-mono text-xs text-slate-300" : "text-white font-medium"}`}>{item.v}</span>
                    </div>
                  ))}
                </div>

                <div className="mb-4">
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Chargers ({selected.chargers?.length})</p>
                  <div className="grid grid-cols-2 gap-2">
                    {selected.chargers?.map(c => {
                      const colors = { Available: "#10b981", Charging: "#60a5fa", Maintenance: "#fbbf24" };
                      return (
                        <div key={c.id} className="p-2 rounded-lg flex items-center gap-2"
                          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: colors[c.status] || "#94a3b8" }} />
                          <div className="min-w-0">
                            <p className="text-white text-xs font-semibold">#{c.id} · {c.power}kW</p>
                            <p className="text-slate-500 text-xs truncate">{c.type}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {selected.facilities?.length > 0 && (
                  <div className="mb-5">
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Facilities</p>
                    <div className="flex flex-wrap gap-2">
                      {selected.facilities.map(f => (
                        <span key={f} className="text-xs px-2.5 py-1 rounded-full border border-cyan-400/20 text-cyan-400"
                          style={{ background: "rgba(0,196,255,0.08)" }}>{f}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <Btn variant="outline" onClick={() => openEdit(selected)} className="flex-1 gap-2"
                    style={{ borderColor: "rgba(0,196,255,0.3)", color: "#00C4FF" }}>
                    ✏️ Edit Station
                  </Btn>
                  <Btn variant="danger" onClick={() => { setConfirmDel(selected); setSelected(null); }} className="flex-1 gap-2">
                    <Icon name="x" className="w-4 h-4" /> Delete
                  </Btn>
                  <Btn variant="ghost" onClick={() => setSelected(null)} className="flex-1">Close</Btn>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Edit Station Modal ── */}
      <AnimatePresence>
        {editTarget && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setEditTarget(null)}>
            <motion.div className="w-full max-w-xl max-h-[92vh] overflow-y-auto"
              initial={{ scale: 0.93, opacity: 0, y: 20 }}
              animate={{ scale: 1,    opacity: 1, y: 0  }}
              exit={{    scale: 0.93, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}>
              <GlassCard className="p-6">

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-black text-white">Edit Station</h3>
                    <p className="text-slate-500 text-xs mt-0.5">{editTarget.name}</p>
                  </div>
                  <button onClick={() => setEditTarget(null)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 border border-white/10">✕</button>
                </div>

                <div className="space-y-4">

                  {/* Basic Info */}
                  <div className="grid grid-cols-1 gap-4">
                    {field("Station Name", "name", "text", "e.g. ChargeWay Ahmedabad")}
                    {field("Address",      "address", "text", "Full address")}
                  </div>

                  {/* Location */}
                  <div className="grid grid-cols-2 gap-4">
                    {field("Latitude",  "lat",  "number", "e.g. 23.0225")}
                    {field("Longitude", "lng",  "number", "e.g. 72.5714")}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>💡</span>
                    <span>Find lat/lng: Go to <a href="https://maps.google.com" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">maps.google.com</a> → right-click on location → copy coordinates</span>
                  </div>

                  {/* Price & Status */}
                  <div className="grid grid-cols-2 gap-4">
                    {field("Price per kWh (₹)", "price_per_kwh", "number", "e.g. 18")}
                    <div>
                      <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1.5 block">Status</label>
                      <select value={editForm.status || "Online"}
                        onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}
                        className="w-full rounded-xl px-4 py-2.5 text-white text-sm outline-none border"
                        style={{ background: "rgba(30,40,60,1)", borderColor: "rgba(0,196,255,0.3)" }}>
                        <option>Online</option>
                        <option>Offline</option>
                      </select>
                    </div>
                  </div>

                  {/* Assign Manager */}
                  <div>
                    <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1.5 block">
                      Assign Station Manager
                    </label>
                    <select value={editForm.managerId || ''}
                      onChange={e => setEditForm(p => ({ ...p, managerId: e.target.value }))}
                      className="w-full rounded-xl px-4 py-2.5 text-white text-sm outline-none border"
                      style={{ background: "rgba(30,40,60,1)", borderColor: editForm.managerId ? "rgba(0,196,255,0.3)" : "rgba(239,68,68,0.4)" }}>
                      <option value="" disabled>— Select a manager (required) —</option>
                      {managers.map(m => (
                        <option key={m._id} value={m._id}>{m.name} ({m.email})</option>
                      ))}
                    </select>
                    {!editForm.managerId && (
                      <p className="text-red-400 text-xs mt-1">Every station must have a manager assigned.</p>
                    )}
                    {managers.length === 0 && (
                      <p className="text-yellow-400 text-xs mt-1">No Station Manager accounts exist yet — create one before assigning.</p>
                    )}
                  </div>

                  {/* Facilities */}
                  <div>
                    <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3 block">
                      Facilities ({facilities.length} selected)
                    </label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {COMMON_FACILITIES.map(f => {
                        const active = facilities.includes(f);
                        return (
                          <button key={f} onClick={() => toggleFacility(f)}
                            className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
                            style={{
                              background:  active ? "rgba(0,196,255,0.15)" : "rgba(255,255,255,0.04)",
                              borderColor: active ? "rgba(0,196,255,0.5)"  : "rgba(255,255,255,0.1)",
                              color:       active ? "#00C4FF"               : "#64748b",
                            }}>
                            {active ? "✓ " : "+ "}{f}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex gap-2">
                      <input value={newFacility} onChange={e => setNewFacility(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && addCustomFacility()}
                        placeholder="Add custom facility..."
                        className="flex-1 rounded-xl px-4 py-2.5 text-white text-sm outline-none border"
                        style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }} />
                      <button onClick={addCustomFacility}
                        className="px-4 py-2.5 rounded-xl text-sm font-semibold"
                        style={{ background: "rgba(0,196,255,0.15)", border: "1px solid rgba(0,196,255,0.3)", color: "#00C4FF" }}>
                        Add
                      </button>
                    </div>
                    {facilities.filter(f => !COMMON_FACILITIES.includes(f)).length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {facilities.filter(f => !COMMON_FACILITIES.includes(f)).map(f => (
                          <span key={f} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                            style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)", color: "#c084fc" }}>
                            {f}
                            <button onClick={() => setFacilities(prev => prev.filter(x => x !== f))}
                              className="text-purple-400 hover:text-red-400 transition-colors font-bold">×</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Save message */}
                {saveMsg && (
                  <div className="mt-4 p-3 rounded-xl text-sm text-center"
                    style={{ background: saveMsg.startsWith('✅') ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                             color:      saveMsg.startsWith('✅') ? "#10b981"               : "#f87171",
                             border:    `1px solid ${saveMsg.startsWith('✅') ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}` }}>
                    {saveMsg}
                  </div>
                )}

                <div className="flex gap-3 mt-5">
                  <Btn onClick={handleSave} loading={saving} className="flex-1">Save Changes</Btn>
                  <Btn variant="ghost" onClick={() => setEditTarget(null)} className="flex-1">Cancel</Btn>
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
                <h3 className="text-lg font-black text-white mb-1">Delete Station?</h3>
                <p className="text-slate-400 text-sm mb-1">
                  Are you sure you want to delete <span className="text-white font-semibold">{confirmDel.name}</span>?
                </p>
                <p className="text-red-400 text-xs mb-6">This will cancel all upcoming bookings and cannot be undone.</p>
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

export default AdminStations;