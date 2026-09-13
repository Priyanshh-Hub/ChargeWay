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

  // Create Station (with manager assignment) — the actual gap this fills:
  // previously the ONLY way a station could ever be created was the public
  // self-service partner signup in auth.js. Admin had no way to open a new
  // ChargeWay-owned station directly, whether under an existing manager
  // (e.g. one manager running stations in two states) or a brand-new one.
  const [createOpen,    setCreateOpen]    = useState(false);
  const [createForm,    setCreateForm]    = useState({ name: '', address: '', lat: '', lng: '', price_per_kwh: '18', networkType: 'Owned' });
  const [managerMode,   setManagerMode]   = useState('existing'); // 'existing' | 'new'
  const [selectedMgrId, setSelectedMgrId] = useState('');
  const [newMgrName,    setNewMgrName]    = useState('');
  const [newMgrEmail,   setNewMgrEmail]   = useState('');
  const [creating,      setCreating]      = useState(false);
  const [createMsg,     setCreateMsg]     = useState('');
  const [newCreds,      setNewCreds]      = useState(null); // { email, tempPassword } shown once after creating a new manager

  // Partner applications queue
  const [applications, setApplications] = useState([]);
  const [appsLoading,   setAppsLoading]   = useState(true);
  const [decidingId,    setDecidingId]    = useState(null); // application currently being approved/rejected
  const [expandedAppId, setExpandedAppId] = useState(null); // which application's full details are shown
  const [rejectTarget,  setRejectTarget]  = useState(null); // application prompting for a reason
  const [rejectReason,  setRejectReason]  = useState('');

  // Edit form state
  const [editForm,    setEditForm]    = useState({});
  const [facilities,  setFacilities]  = useState([]);
  const [newFacility, setNewFacility] = useState('');
  const [saving,      setSaving]      = useState(false);
  const [saveMsg,     setSaveMsg]     = useState('');

  // Search / filter / pagination
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const PAGE_SIZE = 6;
  const [page, setPage] = useState(1);

  const load = async () => {
    const [stRes, usRes] = await Promise.all([
      api.get("/stations"),
      api.get("/users"),
    ]);
    if (stRes.ok) setStations(stRes.data.stations);
    if (usRes.ok) setManagers((usRes.data.users || []).filter(u => u.role === "Station Manager"));
    setLoading(false);
  };

  const loadApplications = async () => {
    setAppsLoading(true);
    const res = await api.get("/stations/partner-applications?status=Pending");
    if (res.ok) setApplications(res.data.stations || []);
    setAppsLoading(false);
  };

  const approveApplication = async (station) => {
    setDecidingId(station._id);
    const res = await api.put(`/stations/${station._id}/approve`);
    if (res.ok) {
      toast.success(`${station.name} is now live on ChargeWay.`);
      setApplications(prev => prev.filter(a => a._id !== station._id));
      setStations(prev => prev.map(s => s._id === station._id ? res.data.station : s));
    } else {
      toast.error(res.error || "Couldn't approve this station");
    }
    setDecidingId(null);
  };

  const submitRejection = async () => {
    if (!rejectReason.trim()) { toast.error("A reason is required."); return; }
    setDecidingId(rejectTarget._id);
    const res = await api.put(`/stations/${rejectTarget._id}/reject`, { reason: rejectReason.trim() });
    if (res.ok) {
      toast.success(`${rejectTarget.name}'s application was rejected.`);
      setApplications(prev => prev.filter(a => a._id !== rejectTarget._id));
      setStations(prev => prev.map(s => s._id === rejectTarget._id ? res.data.station : s));
      setRejectTarget(null); setRejectReason('');
    } else {
      toast.error(res.error || "Couldn't reject this station");
    }
    setDecidingId(null);
  };

  const toggleNetworkType = async (station) => {
    const next = station.networkType === "Partner" ? "Owned" : "Partner";
    const res = await api.put(`/stations/${station._id}/edit`, { networkType: next });
    if (res.ok) {
      setStations(prev => prev.map(s => s._id === station._id ? { ...s, networkType: next } : s));
      toast.success(`${station.name} is now ${next === "Partner" ? "a Partner station" : "ChargeWay-owned"}.`);
    } else {
      toast.error(res.error || "Couldn't update network type");
    }
  };
  useEffect(() => { load(); loadApplications(); }, []);

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
        style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,138,61,0.3)" }} />
    </div>
  );

  const createField = (label, key, type = "text", placeholder = "") => (
    <div>
      <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1.5 block">{label}</label>
      <input type={type} value={createForm[key] ?? ''} placeholder={placeholder}
        onChange={e => setCreateForm(p => ({ ...p, [key]: e.target.value }))}
        className="w-full rounded-xl px-4 py-2.5 text-white text-sm outline-none border transition-all"
        style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,138,61,0.3)" }} />
    </div>
  );

  const resetCreateForm = () => {
    setCreateForm({ name: '', address: '', lat: '', lng: '', price_per_kwh: '18', networkType: 'Owned' });
    setManagerMode('existing'); setSelectedMgrId(''); setNewMgrName(''); setNewMgrEmail('');
    setCreateMsg(''); setNewCreds(null);
  };

  const submitCreateStation = async () => {
    if (!createForm.name.trim() || !createForm.address.trim() || !createForm.lat || !createForm.lng) {
      setCreateMsg("Name, address, and coordinates are required."); return;
    }
    setCreating(true); setCreateMsg('');

    let managerId = selectedMgrId;

    // New-manager path: create the account first (admin-generated
    // credentials, no self-service signup), then use its id below.
    if (managerMode === 'new') {
      if (!newMgrName.trim() || !newMgrEmail.trim()) {
        setCreateMsg("Manager name and email are required."); setCreating(false); return;
      }
      const mgrRes = await api.post("/users/create-manager", { name: newMgrName.trim(), email: newMgrEmail.trim() });
      if (!mgrRes.ok) { setCreateMsg(mgrRes.error || "Couldn't create manager account."); setCreating(false); return; }
      managerId = mgrRes.data.manager._id;
      setNewCreds({ email: mgrRes.data.manager.email, tempPassword: mgrRes.data.tempPassword });
      setManagers(prev => [...prev, mgrRes.data.manager]);
    }

    if (!managerId) {
      setCreateMsg("Select or create a manager for this station."); setCreating(false); return;
    }

    const stRes = await api.post("/stations", {
      name: createForm.name.trim(),
      address: createForm.address.trim(),
      lat: parseFloat(createForm.lat),
      lng: parseFloat(createForm.lng),
      price_per_kwh: parseFloat(createForm.price_per_kwh) || 18,
      networkType: createForm.networkType,
      managerId,
    });

    if (!stRes.ok) {
      setCreateMsg(stRes.error || "Couldn't create station.");
      setCreating(false);
      return; // keep newCreds visible if a manager was just created, so the admin doesn't lose the password
    }

    setStations(prev => [stRes.data.station, ...prev]);
    toast.success(`${createForm.name} created and live.`);
    if (managerMode === 'existing') { resetCreateForm(); setCreateOpen(false); }
    // If a new manager was created, keep the modal open showing the
    // one-time password until the admin explicitly closes it.
    setCreating(false);
  };

  if (loading) return <Spinner />;

  const filtered = stations.filter(s => {
    const matchesSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.address?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "All" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageStations = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-page text-white">
          All Stations <span className="text-slate-500 font-normal text-base">({filtered.length})</span>
        </h2>
        <Btn onClick={() => { resetCreateForm(); setCreateOpen(true); }} className="text-sm px-5">
          + Create Station
        </Btn>
      </div>

      {/* ── Partner Applications queue ── */}
      {(appsLoading || applications.length > 0) && (
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🤝</span>
            <h3 className="font-bold text-white">Partner Applications</h3>
            {!appsLoading && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: "#fbbf24", background: "rgba(251,191,36,0.12)" }}>
                {applications.length} pending
              </span>
            )}
          </div>

          {appsLoading ? (
            <p className="text-slate-500 text-sm">Loading applications...</p>
          ) : (
            <div className="space-y-3">
              {applications.map(a => {
                const expanded = expandedAppId === a._id;
                return (
                <div key={a._id} className="rounded-xl border border-white/10 overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                    <button onClick={() => setExpandedAppId(expanded ? null : a._id)} className="min-w-0 text-left flex-1">
                      <p className="text-white font-semibold text-sm truncate">{a.businessName || a.name}</p>
                      {a.businessType && <p className="text-[10px] text-slate-500 mt-0.5">{a.businessType}</p>}
                      <p className="text-slate-400 text-xs mt-0.5 truncate">{a.address}</p>
                      <p className="text-xs text-[#FF8A3D] mt-1">
                        Applicant: {a.managerId?.name || "Unknown"} ({a.managerId?.email || "—"})
                      </p>
                      <p className="text-slate-500 text-xs mt-0.5">
                        ₹{a.price_per_kwh}/kWh · {a.chargers?.length || 0} chargers · applied {new Date(a.createdAt).toLocaleDateString()}
                        <span className="text-[#FF8A3D] ml-1.5">{expanded ? "▲ Hide details" : "▼ Review details"}</span>
                      </p>
                    </button>
                    <div className="flex gap-2 flex-shrink-0">
                      <Btn onClick={() => approveApplication(a)} loading={decidingId === a._id} className="text-xs px-4 py-2">
                        ✓ Approve
                      </Btn>
                      <Btn variant="outline" onClick={() => { setRejectTarget(a); setRejectReason(''); }}
                        disabled={decidingId === a._id}
                        className="text-xs px-4 py-2" style={{ borderColor: "rgba(248,113,113,0.3)", color: "#f87171" }}>
                        ✕ Reject
                      </Btn>
                    </div>
                  </div>

                  {/* What an admin should actually check before approving:
                      real coordinates (does this place exist?), what
                      chargers they claim to have, and what amenities they
                      listed — the summary line above isn't enough to make
                      an actual decision on. */}
                  {expanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold mb-1.5">Location</p>
                        <p className="text-slate-300 text-xs mb-1">Lat {a.lat}, Lng {a.lng}</p>
                        <a href={`https://maps.google.com/?q=${a.lat},${a.lng}`} target="_blank" rel="noreferrer"
                          className="text-[#FF8A3D] text-xs hover:underline">Open in Google Maps →</a>
                      </div>
                      <div>
                        <p className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold mb-1.5">Facilities claimed</p>
                        {a.facilities?.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {a.facilities.map(f => (
                              <span key={f} className="text-[10px] px-2 py-0.5 rounded-full text-slate-300" style={{ background: "rgba(255,255,255,0.06)" }}>{f}</span>
                            ))}
                          </div>
                        ) : <p className="text-slate-600 text-xs">None listed</p>}
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold mb-1.5">Chargers claimed ({a.chargers?.length || 0})</p>
                        <div className="flex flex-wrap gap-2">
                          {(a.chargers || []).map(c => (
                            <span key={c.id} className="text-xs px-2.5 py-1 rounded-lg text-slate-300 border border-white/10">
                              #{c.id} · {c.type} · {c.power}kW
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );})}
            </div>
          )}
        </GlassCard>
      )}

      {/* Search + filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Icon name="search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search name or address..."
            className="w-full pl-9 pr-3 py-2 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF8A3D]/50" />
        </div>
        <div className="flex gap-2">
          {["All", "Online", "Offline"].map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
              style={{
                background:  statusFilter === s ? "rgba(255,138,61,0.15)" : "rgba(255,255,255,0.03)",
                borderColor: statusFilter === s ? "rgba(255,138,61,0.4)" : "rgba(255,255,255,0.08)",
                color:       statusFilter === s ? "#FF8A3D" : "#94a3b8",
              }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {pageStations.length === 0 && (
          <p className="text-slate-500 text-sm text-center py-10 col-span-2">No stations match your search.</p>
        )}
        {pageStations.map(s => {
          const avail = s.chargers?.filter(c => c.status === "Available").length  || 0;
          const charg = s.chargers?.filter(c => c.status === "Charging").length   || 0;
          const maint = s.chargers?.filter(c => c.status === "Maintenance").length || 0;
          return (
            <GlassCard key={s._id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-white truncate">{s.name}</h3>
                    <button onClick={() => toggleNetworkType(s)}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 transition-all"
                      style={{
                        color: s.networkType === "Partner" ? "#a78bfa" : "#FF8A3D",
                        background: s.networkType === "Partner" ? "rgba(167,139,250,0.12)" : "rgba(255,138,61,0.12)",
                      }}
                      title="Click to reclassify">
                      {s.networkType === "Partner" ? "🤝 Partner" : "⚡ Owned"}
                    </button>
                    {s.approvalStatus !== "Approved" && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{
                          color: s.approvalStatus === "Pending" ? "#fbbf24" : "#f87171",
                          background: s.approvalStatus === "Pending" ? "rgba(251,191,36,0.12)" : "rgba(248,113,113,0.12)",
                        }}>
                        {s.approvalStatus === "Pending" ? "⏳ Pending review" : "✕ Rejected"}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 text-xs mt-0.5 truncate">{s.address}</p>
                  {s.managerId
                    ? <p className="text-xs text-[#FF8A3D] mt-0.5">👤 {s.managerId.name || s.managerId}</p>
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
                  { l: "Charging", v: charg,                   c: "#7C6AE8" },
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
                  style={{ borderColor: "rgba(255,138,61,0.3)", color: "#FF8A3D" }}>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-slate-500">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent">‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className="w-8 h-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-all"
                style={p === page ? { background: "rgba(255,138,61,0.15)", color: "#FF8A3D" } : { color: "#64748b" }}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent">›</button>
          </div>
        </div>
      )}

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
                      const colors = { Available: "#10b981", Charging: "#7C6AE8", Maintenance: "#fbbf24" };
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
                        <span key={f} className="text-xs px-2.5 py-1 rounded-full border border-[#FF8A3D]/20 text-[#FF8A3D]"
                          style={{ background: "rgba(255,138,61,0.08)" }}>{f}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <Btn variant="outline" onClick={() => openEdit(selected)} className="flex-1 gap-2"
                    style={{ borderColor: "rgba(255,138,61,0.3)", color: "#FF8A3D" }}>
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
                    <span>Find lat/lng: Go to <a href="https://maps.google.com" target="_blank" rel="noreferrer" className="text-[#FF8A3D] hover:underline">maps.google.com</a> → right-click on location → copy coordinates</span>
                  </div>

                  {/* Price & Status */}
                  <div className="grid grid-cols-2 gap-4">
                    {field("Price per kWh (₹)", "price_per_kwh", "number", "e.g. 18")}
                    <div>
                      <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1.5 block">Status</label>
                      <select value={editForm.status || "Online"}
                        onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}
                        className="w-full rounded-xl px-4 py-2.5 text-white text-sm outline-none border"
                        style={{ background: "rgba(30,40,60,1)", borderColor: "rgba(255,138,61,0.3)" }}>
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
                      style={{ background: "rgba(30,40,60,1)", borderColor: editForm.managerId ? "rgba(255,138,61,0.3)" : "rgba(239,68,68,0.4)" }}>
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
                              background:  active ? "rgba(255,138,61,0.15)" : "rgba(255,255,255,0.04)",
                              borderColor: active ? "rgba(255,138,61,0.5)"  : "rgba(255,255,255,0.1)",
                              color:       active ? "#FF8A3D"               : "#64748b",
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
                        style={{ background: "rgba(255,138,61,0.15)", border: "1px solid rgba(255,138,61,0.3)", color: "#FF8A3D" }}>
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

      {/* ── Reject Application Modal ── */}
      <AnimatePresence>
        {rejectTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
            onClick={() => setRejectTarget(null)}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              onClick={e => e.stopPropagation()} className="w-full max-w-sm">
              <GlassCard className="p-6">
                <h3 className="text-lg font-black text-white mb-1">Reject Application</h3>
                <p className="text-slate-400 text-sm mb-4">
                  Tell <span className="text-white font-semibold">{rejectTarget.managerId?.name || "the applicant"}</span> what needs to change before "{rejectTarget.name}" can be approved.
                </p>
                <textarea rows={4} value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                  placeholder="e.g. Please add photos of the charging bay and confirm the address."
                  className="w-full rounded-xl px-4 py-2.5 text-white text-sm outline-none border resize-none mb-4"
                  style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }} />
                <div className="flex gap-3">
                  <Btn variant="ghost" onClick={() => setRejectTarget(null)} className="flex-1">Cancel</Btn>
                  <Btn variant="danger" onClick={submitRejection} loading={decidingId === rejectTarget._id} className="flex-1">
                    Send Rejection
                  </Btn>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* ── Create Station Modal ── */}
      <AnimatePresence>
        {createOpen && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => { setCreateOpen(false); resetCreateForm(); }}>
            <motion.div className="w-full max-w-xl max-h-[92vh] overflow-y-auto"
              initial={{ scale: 0.93, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.93, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}>
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-black text-white">Create Station</h3>
                    <p className="text-slate-500 text-xs mt-0.5">Opens a new ChargeWay station directly — no partner application needed.</p>
                  </div>
                  <button onClick={() => { setCreateOpen(false); resetCreateForm(); }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 border border-white/10">✕</button>
                </div>

                {newCreds ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)" }}>
                      <p className="text-emerald-400 font-semibold text-sm mb-3">✓ Manager account created</p>
                      <p className="text-slate-400 text-xs mb-1">Email</p>
                      <p className="text-white font-mono text-sm mb-3">{newCreds.email}</p>
                      <p className="text-slate-400 text-xs mb-1">Temporary password</p>
                      <div className="flex items-center gap-2">
                        <p className="text-white font-mono text-lg font-bold tracking-wide">{newCreds.tempPassword}</p>
                        <button onClick={() => { navigator.clipboard.writeText(newCreds.tempPassword); toast.success("Copied"); }}
                          className="text-xs px-2.5 py-1 rounded-lg text-[#FF8A3D]" style={{ background: "rgba(255,138,61,0.12)" }}>
                          Copy
                        </button>
                      </div>
                      <p className="text-amber-400 text-xs mt-3">⚠️ This password won't be shown again — copy it and share it with the manager now.</p>
                    </div>
                    <Btn onClick={() => { setCreateOpen(false); resetCreateForm(); }} className="w-full">Done</Btn>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      {createField("Station Name", "name", "text", "e.g. ChargeWay Jaipur")}
                      {createField("Address", "address", "text", "Full address")}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {createField("Latitude", "lat", "number", "e.g. 26.9124")}
                      {createField("Longitude", "lng", "number", "e.g. 75.7873")}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {createField("Price per kWh (₹)", "price_per_kwh", "number", "e.g. 18")}
                      <div>
                        <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1.5 block">Network Type</label>
                        <select value={createForm.networkType} onChange={e => setCreateForm(p => ({ ...p, networkType: e.target.value }))}
                          className="w-full rounded-xl px-4 py-2.5 text-white text-sm outline-none border"
                          style={{ background: "rgba(30,40,60,1)", borderColor: "rgba(255,138,61,0.3)" }}>
                          <option value="Owned">⚡ Owned</option>
                          <option value="Partner">🤝 Partner</option>
                        </select>
                      </div>
                    </div>

                    {/* Manager assignment */}
                    <div className="pt-2 border-t border-white/10">
                      <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2 block">Station Manager</label>
                      <div className="flex gap-2 mb-3">
                        <button onClick={() => setManagerMode('existing')}
                          className="flex-1 py-2 rounded-lg text-xs font-semibold border transition-all"
                          style={{
                            background:  managerMode === 'existing' ? "rgba(255,138,61,0.15)" : "rgba(255,255,255,0.03)",
                            borderColor: managerMode === 'existing' ? "rgba(255,138,61,0.4)"  : "rgba(255,255,255,0.1)",
                            color:       managerMode === 'existing' ? "#FF8A3D" : "#64748b",
                          }}>
                          Use Existing Manager
                        </button>
                        <button onClick={() => setManagerMode('new')}
                          className="flex-1 py-2 rounded-lg text-xs font-semibold border transition-all"
                          style={{
                            background:  managerMode === 'new' ? "rgba(255,138,61,0.15)" : "rgba(255,255,255,0.03)",
                            borderColor: managerMode === 'new' ? "rgba(255,138,61,0.4)"  : "rgba(255,255,255,0.1)",
                            color:       managerMode === 'new' ? "#FF8A3D" : "#64748b",
                          }}>
                          Create New Manager
                        </button>
                      </div>

                      {managerMode === 'existing' ? (
                        <div>
                          <select value={selectedMgrId} onChange={e => setSelectedMgrId(e.target.value)}
                            className="w-full rounded-xl px-4 py-2.5 text-white text-sm outline-none border"
                            style={{ background: "rgba(30,40,60,1)", borderColor: selectedMgrId ? "rgba(255,138,61,0.3)" : "rgba(239,68,68,0.4)" }}>
                            <option value="" disabled>— Select a manager —</option>
                            {managers.map(m => <option key={m._id} value={m._id}>{m.name} ({m.email})</option>)}
                          </select>
                          <p className="text-slate-500 text-xs mt-1.5">
                            One manager can run multiple stations — pick the same person again for a second location in a new city or state.
                          </p>
                          {managers.length === 0 && <p className="text-yellow-400 text-xs mt-1">No managers exist yet — switch to "Create New Manager".</p>}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <input value={newMgrName} onChange={e => setNewMgrName(e.target.value)} placeholder="Manager's full name"
                              className="w-full rounded-xl px-4 py-2.5 text-white text-sm outline-none border"
                              style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,138,61,0.3)" }} />
                          </div>
                          <div>
                            <input value={newMgrEmail} onChange={e => setNewMgrEmail(e.target.value)} type="email" placeholder="manager@email.com"
                              className="w-full rounded-xl px-4 py-2.5 text-white text-sm outline-none border"
                              style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,138,61,0.3)" }} />
                          </div>
                          <p className="text-slate-500 text-xs sm:col-span-2">
                            We'll generate a login password and show it to you once — share it with the manager yourself.
                          </p>
                        </div>
                      )}
                    </div>

                    {createMsg && (
                      <div className="p-3 rounded-xl text-sm text-center" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}>
                        {createMsg}
                      </div>
                    )}

                    <div className="flex gap-3 pt-1">
                      <Btn onClick={submitCreateStation} loading={creating} className="flex-1">Create Station</Btn>
                      <Btn variant="ghost" onClick={() => { setCreateOpen(false); resetCreateForm(); }} className="flex-1">Cancel</Btn>
                    </div>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminStations;