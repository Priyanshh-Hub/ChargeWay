import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../api/api';
import { GlassCard, Btn, Spinner, StatCard } from '../ui/index';
import Icon from '../ui/Icon';

const COMMON_FACILITIES = [
  "WiFi", "Restroom", "Parking", "CCTV", "Cafeteria",
  "Air Conditioning", "Waiting Area", "EV Shop", "Car Wash", "Security Guard"
];

const ManagerDashboard = ({ user, setActiveView }) => {
  const [stations,        setStations]        = useState([]);   // ALL assigned stations
  const [activeIdx,       setActiveIdx]       = useState(0);    // which station is selected
  const [bookings,        setBookings]        = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [toggling,        setToggling]        = useState(false);
  const [updatingCharger, setUpdatingCharger] = useState(null);
  // Hardware-upgrade editor (e.g. swapping an AC 7kW unit for DC 180kW) —
  // separate from the status buttons since it changes the charger's spec,
  // not just whether it's open for business.
  const [editingChargerId, setEditingChargerId] = useState(null);
  const [editType, setEditType] = useState('');
  const [editPower, setEditPower] = useState('');
  const [savingSpec, setSavingSpec] = useState(false);
  const [specMsg, setSpecMsg] = useState('');

  // Settings panel
  const [showSettings,   setShowSettings]   = useState(false);
  const [newPrice,       setNewPrice]       = useState('');
  const [newName,        setNewName]        = useState('');
  const [newAddress,     setNewAddress]     = useState('');
  const [newLat,         setNewLat]         = useState('');
  const [newLng,         setNewLng]         = useState('');
  const [facilities,     setFacilities]     = useState([]);
  const [newFacility,    setNewFacility]    = useState('');
  const [peakPricing,    setPeakPricing]    = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg,    setSettingsMsg]    = useState('');

  const loadData = async () => {
    const [stRes, bkRes] = await Promise.all([
      api.get("/stations"),
      api.get("/bookings"),
    ]);
    if (stRes.ok) {
      // ✅ Find ALL stations assigned to this manager
      const mine = stRes.data.stations.filter(
        s => s.managerId?._id === user._id || s.managerId === user._id
      );
      setStations(mine);
    }
    if (bkRes.ok) setBookings(bkRes.data.bookings);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [user._id]);

  // ✅ Sync settings form whenever active station changes
  const station = stations[activeIdx] || null;
  useEffect(() => {
    if (!station) return;
    setNewPrice(station.price_per_kwh?.toString() || '');
    setNewName(station.name || '');
    setNewAddress(station.address || '');
    setNewLat(station.lat?.toString() || '');
    setNewLng(station.lng?.toString() || '');
    setFacilities(station.facilities || []);
    setPeakPricing(station.peakPricing || {
      enabled: false, morningStart: 8, morningEnd: 11, eveningStart: 18, eveningEnd: 21,
    });
    setSettingsMsg('');
  }, [activeIdx, stations]);

  const toggleStationStatus = async () => {
    if (!station) return;
    setToggling(true);
    const newStatus = station.status === "Online" ? "Offline" : "Online";
    const res = await api.put(`/stations/${station._id}/status`, { status: newStatus });
    if (res.ok) setStations(prev => prev.map((s, i) => i === activeIdx ? { ...s, status: newStatus } : s));
    setToggling(false);
  };

  const updateChargerStatus = async (chargerId, newStatus) => {
    setUpdatingCharger(chargerId);
    const res = await api.put(`/stations/${station._id}/charger/${chargerId}`, { status: newStatus });
    if (res.ok) setStations(prev => prev.map((s, i) => i === activeIdx
      ? { ...s, chargers: s.chargers.map(c => c.id === chargerId ? { ...c, status: newStatus } : c) }
      : s
    ));
    setUpdatingCharger(null);
  };

  const startEditingSpec = (c) => {
    setEditingChargerId(c.id);
    setEditType(c.type);
    setEditPower(String(c.power));
    setSpecMsg('');
  };

  const saveChargerSpec = async (chargerId) => {
    setSavingSpec(true); setSpecMsg('');
    const res = await api.put(`/stations/${station._id}/charger/${chargerId}`, {
      type: editType.trim(), power: Number(editPower),
    });
    if (res.ok) {
      setStations(prev => prev.map((s, i) => i === activeIdx
        ? { ...s, chargers: s.chargers.map(c => c.id === chargerId ? { ...c, type: editType.trim(), power: Number(editPower) } : c) }
        : s
      ));
      setEditingChargerId(null);
    } else {
      setSpecMsg(res.error || "Couldn't update charger.");
    }
    setSavingSpec(false);
  };

  const completeBooking = async (id) => {
    const res = await api.put(`/bookings/${id}/complete`, {});
    if (res.ok) {
      setBookings(prev => prev.map(b => b._id === id ? { ...b, status: "Completed" } : b));
      await loadData();
    }
  };

  // Rider check-in verification — Uber/Rapido-style 4-digit PIN. Verifying
  // it is what actually starts the charging session; the charger only
  // moves from Reserved to Charging at this moment, not at booking time.
  const [checkInCode, setCheckInCode] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInMsg, setCheckInMsg] = useState('');
  const verifyCheckIn = async () => {
    if (!checkInCode.trim()) return;
    setCheckingIn(true); setCheckInMsg('');
    const res = await api.put('/bookings/verify-checkin', { otp: checkInCode.trim() });
    if (res.ok) {
      setCheckInMsg(`✅ ${res.data.message}`);
      setCheckInCode('');
      setBookings(prev => prev.map(b => b._id === res.data.booking._id ? { ...b, checkedIn: true, chargingStartedAt: res.data.booking.chargingStartedAt } : b));
      await loadData(); // refresh charger status grid too
    } else {
      setCheckInMsg(`❌ ${res.error || 'Not found'}`);
    }
    setCheckingIn(false);
  };

  const saveSettings = async () => {
    setSavingSettings(true); setSettingsMsg('');
    const price = parseFloat(newPrice);
    if (isNaN(price) || price <= 0) { setSettingsMsg('❌ Enter a valid price');        setSavingSettings(false); return; }
    if (!newName.trim())             { setSettingsMsg('❌ Station name is required');   setSavingSettings(false); return; }
    if (!newAddress.trim())          { setSettingsMsg('❌ Address is required');        setSavingSettings(false); return; }
    const lat = parseFloat(newLat), lng = parseFloat(newLng);
    if (isNaN(lat) || isNaN(lng))    { setSettingsMsg('❌ Enter valid coordinates');    setSavingSettings(false); return; }

    const res = await api.put(`/stations/${station._id}/settings`, {
      price_per_kwh: price, facilities,
      name: newName.trim(), address: newAddress.trim(), lat, lng,
      peakPricing,
    });
    if (res.ok) {
      setStations(prev => prev.map((s, i) => i === activeIdx ? res.data.station : s));
      setSettingsMsg('✅ Settings saved!');
      setTimeout(() => { setSettingsMsg(''); setShowSettings(false); }, 1500);
    } else {
      setSettingsMsg('❌ ' + (res.error || 'Failed to save'));
    }
    setSavingSettings(false);
  };

  const toggleFacility  = (f) => setFacilities(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  const addCustomFacility = () => {
    const f = newFacility.trim();
    if (f && !facilities.includes(f)) { setFacilities(prev => [...prev, f]); setNewFacility(''); }
  };

  if (loading) return <Spinner />;

  if (stations.length === 0) return (
    <GlassCard className="p-12 text-center">
      <Icon name="stations" className="w-16 h-16 text-slate-600 mx-auto mb-4" />
      <p className="text-slate-400 text-lg">No station assigned to your account.</p>
      <p className="text-slate-600 text-sm mt-2">Contact admin to get a station assigned.</p>
    </GlassCard>
  );

  const myBookings    = bookings.filter(b => b.stationId === station._id || b.stationId?._id === station._id);
  const upcoming      = myBookings.filter(b => b.status === "Upcoming");
  const completed     = myBookings.filter(b => b.status === "Completed");
  const myRevenue     = completed.reduce((s, b) => s + (b.totalCost || 0), 0);
  const availChargers = station.chargers?.filter(c => c.status === "Available").length || 0;

  const chargerStatuses  = ["Available", "Maintenance"]; // the only manually-settable states now — see backend note
  const chargerStatusCfg = {
    Available:   { bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.5)",  text: "#10b981" },
    Reserved:    { bg: "rgba(245,158,11,0.12)",   border: "rgba(245,158,11,0.5)",  text: "#f59e0b" },
    Charging:    { bg: "rgba(59,130,246,0.12)",   border: "rgba(59,130,246,0.5)",  text: "#7C6AE8" },
    Maintenance: { bg: "rgba(245,158,11,0.12)",   border: "rgba(245,158,11,0.5)",  text: "#fbbf24" },
  };

  return (
    <div className="space-y-8">

      {/* ── Greeting hero ── */}
      <GlassCard className="p-6 relative overflow-hidden"
        style={{ background: "linear-gradient(120deg, rgba(91,71,224,0.12), rgba(255,138,61,0.05))" }}>
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, #FF8A3D, transparent 70%)" }} />
        <div className="relative">
          <h1 className="text-page text-white">
            {(() => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; })()}, {user?.name?.split(" ")[0]}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {stations.length > 1 ? `Managing ${stations.length} stations.` : "Here's how your station is doing."}
          </p>
        </div>
      </GlassCard>

      {/* ── Station Switcher (only shows if manager has multiple stations) ── */}
      {stations.length > 1 && (
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-slate-500 text-sm font-medium">Your Stations:</p>
          {stations.map((s, i) => (
            <button key={s._id} onClick={() => setActiveIdx(i)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all"
              style={{
                background:  i === activeIdx ? "rgba(255,138,61,0.15)"  : "rgba(255,255,255,0.04)",
                borderColor: i === activeIdx ? "rgba(255,138,61,0.5)"   : "rgba(255,255,255,0.1)",
                color:       i === activeIdx ? "#FF8A3D"                : "#64748b",
              }}>
              <span className={`w-2 h-2 rounded-full ${s.status === "Online" ? "bg-green-400" : "bg-red-400"}`} />
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Station Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-slate-400 text-sm mb-1">
            {stations.length > 1 ? `Station ${activeIdx + 1} of ${stations.length}` : "My Station"}
          </p>
          <h2 className="text-card text-white">{station.name}</h2>
          <p className="text-slate-400">{station.address}</p>
          <p className="text-slate-500 text-xs mt-1 cw-figure">₹{station.price_per_kwh}/kWh · {station.chargers?.length} chargers</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`px-3 py-1.5 rounded-full text-sm font-bold border ${station.status === "Online" ? "text-green-400 bg-green-400/15 border-green-400/20" : "text-red-400 bg-red-400/15 border-red-400/20"}`}>
            {station.status === "Online" ? "🟢 Online" : "🔴 Offline"}
          </span>
          <Btn variant={station.status === "Online" ? "danger" : "success"} onClick={toggleStationStatus} loading={toggling} className="gap-2 text-sm">
            <Icon name="bolt" className="w-4 h-4" />
            {station.status === "Online" ? "Set Offline" : "Set Online"}
          </Btn>
          <Btn variant="outline" onClick={() => setShowSettings(true)} className="gap-2 text-sm">⚙️ Settings</Btn>
          <Btn variant="outline" onClick={() => setActiveView("analytics")} className="gap-2 text-sm">
            <Icon name="analytics" className="w-4 h-4" /> Analytics
          </Btn>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="My Revenue"      value={`₹${myRevenue.toFixed(0)}`}                         icon="bolt"     color="#FF8A3D" />
        <StatCard label="Sessions Done"   value={completed.length}                                    icon="booking"  color="#10b981" />
        <StatCard label="Active Bookings" value={upcoming.length}                                     icon="booking"  color="#7C6AE8" />
        <StatCard label="Available"       value={`${availChargers}/${station.chargers?.length || 0}`} icon="stations" color="#a78bfa" />
      </div>

      {/* Facilities */}
      {station.facilities?.length > 0 && (
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-300">Station Facilities</h3>
            <button onClick={() => setShowSettings(true)} className="text-xs text-[#FF8A3D] hover:text-[#FFAB70]">Edit ✏️</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {station.facilities.map(f => (
              <span key={f} className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: "rgba(255,138,61,0.1)", border: "1px solid rgba(255,138,61,0.2)", color: "#FF8A3D" }}>
                {f}
              </span>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Charger Management */}
      <GlassCard className="p-6">
        <h3 className="font-bold text-white mb-1">Charger Management</h3>
        <p className="text-slate-500 text-xs mb-5">Reserved/Charging follow bookings automatically — click Available or Maintenance to manually take a charger in or out of service.</p>
        <div className="space-y-3">
          {station.chargers?.map(c => {
            const cfg        = chargerStatusCfg[c.status] || chargerStatusCfg.Maintenance;
            const isUpdating = updatingCharger === c.id;
            return (
              <div key={c.id} className="flex items-center gap-4 p-4 rounded-xl border border-white/10 flex-wrap"
                style={{ background: "rgba(255,255,255,0.02)" }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg flex-shrink-0"
                  style={{ background: cfg.bg, border: `2px solid ${cfg.border}`, color: cfg.text }}>
                  #{c.id}
                </div>
                <div className="flex-1 min-w-0">
                  {editingChargerId === c.id ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <input value={editType} onChange={e => setEditType(e.target.value)} placeholder="e.g. DC Ultra Fast"
                        className="w-36 px-2.5 py-1.5 rounded-lg text-sm text-white outline-none border"
                        style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.15)" }} />
                      <input value={editPower} onChange={e => setEditPower(e.target.value)} type="number" min="1" max="1000" placeholder="kW"
                        className="w-20 px-2.5 py-1.5 rounded-lg text-sm text-white outline-none border cw-figure"
                        style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.15)" }} />
                      <button onClick={() => saveChargerSpec(c.id)} disabled={savingSpec || !editType.trim() || !editPower}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: "#FF8A3D", opacity: savingSpec ? 0.6 : 1 }}>
                        {savingSpec ? "Saving..." : "Save"}
                      </button>
                      <button onClick={() => setEditingChargerId(null)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white">
                        Cancel
                      </button>
                      {specMsg && <p className="text-red-400 text-xs w-full">{specMsg}</p>}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="text-white font-semibold">{c.type} · {c.power}kW</p>
                        <p className="text-xs font-semibold mt-0.5" style={{ color: cfg.text }}>{c.status}</p>
                      </div>
                      {!["Reserved", "Charging"].includes(c.status) && (
                        <button onClick={() => startEditingSpec(c)} title="Upgrade/change hardware (type, power)"
                          className="text-slate-500 hover:text-[#FF8A3D] transition-colors flex-shrink-0">
                          <Icon name="edit" className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {chargerStatuses.map(s => (
                    <button key={s}
                      onClick={() => !isUpdating && c.status !== s && updateChargerStatus(c.id, s)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                      style={{
                        background:  c.status === s ? chargerStatusCfg[s].bg     : "rgba(255,255,255,0.03)",
                        borderColor: c.status === s ? chargerStatusCfg[s].border  : "rgba(255,255,255,0.1)",
                        color:       c.status === s ? chargerStatusCfg[s].text    : "#64748b",
                        cursor:      isUpdating || c.status === s ? "default"     : "pointer",
                        opacity:     isUpdating ? 0.5 : 1,
                      }}>
                      {isUpdating && c.status !== s ? "..." : s}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rider Check-in */}
        <GlassCard className="p-6">
          <h3 className="font-bold text-slate-300 mb-1">Verify & Start Charging</h3>
          <p className="text-slate-500 text-xs mb-3">
            Enter the 4-digit PIN the rider reads out — this confirms arrival and starts their session.
            Verify it the moment they hand it to you: this timestamp is what any late-arrival fee is
            measured against, so a delay on your end can unfairly cost the rider.
          </p>
          <div className="flex gap-2">
            <input value={checkInCode} onChange={e => setCheckInCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && verifyCheckIn()}
              placeholder="e.g. 4821" maxLength={4}
              className="flex-1 rounded-xl px-4 py-2.5 text-white text-sm cw-figure tracking-widest outline-none border"
              style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }} />
            <Btn onClick={verifyCheckIn} loading={checkingIn} disabled={!checkInCode.trim()}>Verify & Start</Btn>
          </div>
          {checkInMsg && <p className="text-sm mt-2" style={{ color: checkInMsg.startsWith('✅') ? '#10b981' : '#f87171' }}>{checkInMsg}</p>}
        </GlassCard>

        {/* Upcoming Bookings */}
        <GlassCard className="p-6">
          <h3 className="font-bold text-slate-300 mb-4">
            Upcoming Bookings
            {upcoming.length > 0 && <span className="ml-2 text-xs bg-[#7C6AE8]/20 text-[#7C6AE8] px-2 py-0.5 rounded-full">{upcoming.length}</span>}
          </h3>
          {upcoming.length === 0 ? (
            <div className="text-center py-8"><p className="text-slate-500 text-sm">No upcoming bookings</p></div>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {upcoming.map(b => (
                <div key={b._id} className="p-3 rounded-xl border border-white/10 flex items-center justify-between"
                  style={{ background: "rgba(255,255,255,0.02)" }}>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-semibold text-sm">{b.userId?.name || "User"}</p>
                      {b.chargingStartedAt ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-green-400" style={{ background: "rgba(34,197,94,0.1)" }}>⚡ Charging</span>
                      ) : (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-slate-500" style={{ background: "rgba(255,255,255,0.05)" }}>🕒 Reserved — not arrived</span>
                      )}
                    </div>
                    <p className="text-slate-400 text-xs">Charger #{b.chargerId} · {b.timeSlot} · {b.date}</p>
                    <p className="text-[#FF8A3D] text-xs font-bold cw-figure">
                      ₹{b.totalCost}
                      {b.paymentMethod === "Cash" && (
                        <span className="ml-1.5 text-amber-400 font-semibold">· Collect cash</span>
                      )}
                    </p>
                  </div>
                  <Btn onClick={() => completeBooking(b._id)} disabled={!b.chargingStartedAt} className="text-xs py-1.5 px-3">✓ Complete</Btn>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Recent Sessions */}
        <GlassCard className="p-6">
          <h3 className="font-bold text-slate-300 mb-4">Recent Sessions</h3>
          {completed.length === 0 ? (
            <div className="text-center py-8"><p className="text-slate-500 text-sm">No completed sessions yet</p></div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {completed.slice(0, 6).map(b => (
                <div key={b._id} className="flex items-center justify-between p-3 rounded-xl border border-white/5"
                  style={{ background: "rgba(16,185,129,0.03)" }}>
                  <div>
                    <p className="text-white text-sm font-semibold">{b.userId?.name || "User"}</p>
                    <p className="text-slate-400 text-xs">Charger #{b.chargerId} · {b.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-bold text-sm">₹{b.totalCost}</p>
                    <p className="text-slate-500 text-xs">{b.energyKwh} kWh</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* ── Settings Modal ── */}
      <AnimatePresence>
        {showSettings && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowSettings(false)}>
            <motion.div className="w-full max-w-lg max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.93, opacity: 0, y: 20 }}
              animate={{ scale: 1,    opacity: 1, y: 0  }}
              exit={{    scale: 0.93, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}>
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-black text-white">Station Settings</h3>
                    <p className="text-slate-500 text-xs mt-0.5">{station.name}</p>
                  </div>
                  <button onClick={() => setShowSettings(false)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 border border-white/10">✕</button>
                </div>

                <div className="mb-4">
                  <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2 block">Station Name</label>
                  <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                    className="w-full rounded-xl px-4 py-3 text-white outline-none border transition-all"
                    style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,138,61,0.3)" }} />
                </div>

                <div className="mb-4">
                  <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2 block">Address</label>
                  <input type="text" value={newAddress} onChange={e => setNewAddress(e.target.value)}
                    className="w-full rounded-xl px-4 py-3 text-white outline-none border transition-all"
                    style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,138,61,0.3)" }} />
                </div>

                <div className="mb-4">
                  <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2 block">Location Coordinates</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="number" value={newLat} onChange={e => setNewLat(e.target.value)} placeholder="Latitude"
                      className="w-full rounded-xl px-4 py-3 text-white outline-none border"
                      style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,138,61,0.3)" }} />
                    <input type="number" value={newLng} onChange={e => setNewLng(e.target.value)} placeholder="Longitude"
                      className="w-full rounded-xl px-4 py-3 text-white outline-none border"
                      style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,138,61,0.3)" }} />
                  </div>
                  <p className="text-slate-600 text-xs mt-1.5">💡 Right-click on <a href="https://maps.google.com" target="_blank" rel="noreferrer" className="text-[#FF8A3D] hover:underline">Google Maps</a> → copy coordinates</p>
                </div>

                <div className="mb-6">
                  <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2 block">Price per kWh (₹)</label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#FF8A3D] font-bold">₹</span>
                      <input type="number" min="0.1" step="0.1" value={newPrice} onChange={e => setNewPrice(e.target.value)}
                        className="w-full rounded-xl pl-8 pr-4 py-3 text-white outline-none border"
                        style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,138,61,0.3)" }} />
                    </div>
                    <span className="text-slate-500 text-sm">per kWh</span>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3 block">Facilities ({facilities.length} selected)</label>
                  <div className="flex flex-wrap gap-2 mb-4">
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
                      style={{ background: "rgba(255,138,61,0.15)", border: "1px solid rgba(255,138,61,0.3)", color: "#FF8A3D" }}>Add</button>
                  </div>
                  {facilities.filter(f => !COMMON_FACILITIES.includes(f)).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {facilities.filter(f => !COMMON_FACILITIES.includes(f)).map(f => (
                        <span key={f} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                          style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)", color: "#c084fc" }}>
                          {f}
                          <button onClick={() => setFacilities(prev => prev.filter(x => x !== f))}
                            className="text-purple-400 hover:text-red-400 font-bold">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Peak / Off-Peak Hours ── */}
                <div className="mb-4 p-4 rounded-xl border border-white/10" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-white font-semibold text-sm">Time-of-Use Pricing</p>
                      <p className="text-slate-500 text-xs mt-0.5">Set your busy hours here — the rate multiplier and platform fee are set platform-wide by ChargeWay admin, so pricing stays consistent across every station.</p>
                    </div>
                    <button onClick={() => setPeakPricing(p => ({ ...p, enabled: !p.enabled }))}
                      className="relative w-10 h-6 rounded-full flex-shrink-0 transition-all"
                      style={{ background: peakPricing?.enabled ? "#FF8A3D" : "rgba(255,255,255,0.15)" }}>
                      <span className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all" style={{ left: peakPricing?.enabled ? 20 : 4 }} />
                    </button>
                  </div>

                  {peakPricing?.enabled && (
                    <div className="space-y-3 pt-2 border-t border-white/5">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Morning peak</p>
                          <div className="flex items-center gap-1.5">
                            <input type="number" min="0" max="23" value={peakPricing.morningStart}
                              onChange={e => setPeakPricing(p => ({ ...p, morningStart: parseInt(e.target.value) || 0 }))}
                              className="w-14 rounded-lg px-2 py-1.5 text-white text-xs cw-figure text-center border" style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }} />
                            <span className="text-slate-500 text-xs">–</span>
                            <input type="number" min="0" max="23" value={peakPricing.morningEnd}
                              onChange={e => setPeakPricing(p => ({ ...p, morningEnd: parseInt(e.target.value) || 0 }))}
                              className="w-14 rounded-lg px-2 py-1.5 text-white text-xs cw-figure text-center border" style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }} />
                            <span className="text-slate-600 text-xs">hr (24h)</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Evening peak</p>
                          <div className="flex items-center gap-1.5">
                            <input type="number" min="0" max="23" value={peakPricing.eveningStart}
                              onChange={e => setPeakPricing(p => ({ ...p, eveningStart: parseInt(e.target.value) || 0 }))}
                              className="w-14 rounded-lg px-2 py-1.5 text-white text-xs cw-figure text-center border" style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }} />
                            <span className="text-slate-500 text-xs">–</span>
                            <input type="number" min="0" max="23" value={peakPricing.eveningEnd}
                              onChange={e => setPeakPricing(p => ({ ...p, eveningEnd: parseInt(e.target.value) || 0 }))}
                              className="w-14 rounded-lg px-2 py-1.5 text-white text-xs cw-figure text-center border" style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }} />
                            <span className="text-slate-600 text-xs">hr (24h)</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-600 pt-1">
                        Rate and platform fee during these windows are set by admin under Platform Pricing — a station manager can't change the amount, only the hours.
                      </p>
                    </div>
                  )}
                </div>

                {settingsMsg && (
                  <div className="mb-4 p-3 rounded-xl text-sm text-center"
                    style={{ background: settingsMsg.startsWith('✅') ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                             color:      settingsMsg.startsWith('✅') ? "#10b981"               : "#f87171",
                             border:    `1px solid ${settingsMsg.startsWith('✅') ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}` }}>
                    {settingsMsg}
                  </div>
                )}

                <div className="flex gap-3">
                  <Btn onClick={saveSettings} loading={savingSettings} className="flex-1">Save Settings</Btn>
                  <Btn variant="ghost" onClick={() => setShowSettings(false)} className="flex-1">Cancel</Btn>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ManagerDashboard;