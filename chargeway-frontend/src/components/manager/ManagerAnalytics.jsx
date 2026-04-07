import React, { useState, useEffect } from 'react';
import { api } from '../../api/api';
import { GlassCard, Spinner, StatCard } from '../ui/index';

const ManagerAnalytics = ({ user }) => {
  const [station,  setStation]  = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    (async () => {
      // Step 1: find this manager's station
      const stRes = await api.get("/stations");
      if (!stRes.ok) { setLoading(false); return; }
      const mine = stRes.data.stations.find(
        s => s.managerId?._id === user._id || s.managerId === user._id
      );
      if (!mine) { setLoading(false); return; }
      setStation(mine);

      // Step 2: get ALL bookings and filter to this station only
      const bkRes = await api.get("/bookings");
      if (bkRes.ok) {
        const stationBookings = bkRes.data.bookings.filter(
          b => b.stationId === mine._id || b.stationId?._id === mine._id
        );
        setBookings(stationBookings);
      }
      setLoading(false);
    })();
  }, [user._id]);

  if (loading) return <Spinner />;
  if (!station) return (
    <GlassCard className="p-12 text-center">
      <p className="text-slate-400">No station assigned to you.</p>
    </GlassCard>
  );

  // ── Compute stats from THIS station's bookings only ──
  const completed   = bookings.filter(b => b.status === "Completed");
  const upcoming    = bookings.filter(b => b.status === "Upcoming");
  const cancelled   = bookings.filter(b => b.status === "Cancelled");
  const revenue     = completed.reduce((s, b) => s + (b.totalCost  || 0), 0);
  const totalEnergy = completed.reduce((s, b) => s + (b.energyKwh  || 0), 0);
  const avgPerSession = completed.length > 0 ? revenue / completed.length : 0;

  // ── Monthly chart (last 6 months) ──
  const now = new Date();
  const months = [], monthlyRev = [], monthlySessions = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toLocaleString("default", { month: "short" }));
    const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
    const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0];
    const mBks  = completed.filter(b => b.date && b.date >= start && b.date <= end);
    monthlyRev.push(mBks.reduce((s, b) => s + (b.totalCost || 0), 0));
    monthlySessions.push(mBks.length);
  }
  const maxRev = Math.max(...monthlyRev, 1);

  // ── Charger performance ──
  const chargerStats = (station.chargers || []).map(c => {
    const cBks = completed.filter(b => b.chargerId === c.id);
    return {
      id: c.id, type: c.type, power: c.power, status: c.status,
      sessions: cBks.length,
      revenue:  cBks.reduce((s, b) => s + (b.totalCost  || 0), 0),
      energy:   cBks.reduce((s, b) => s + (b.energyKwh  || 0), 0),
    };
  });

  const recentBookings     = [...bookings].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 5);
  const statusColors       = { Available: "#10b981", Charging: "#60a5fa", Maintenance: "#fbbf24" };
  const bookingStatusColor = { Completed: "#10b981", Upcoming: "#60a5fa", Cancelled: "#ef4444" };

  return (
    <div className="space-y-8">

      {/* Station Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">{station.name}</h2>
          <p className="text-slate-400 text-sm">{station.address}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
              style={{ background: station.status === "Online" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", color: station.status === "Online" ? "#10b981" : "#ef4444" }}>
              {station.status === "Online" ? "🟢 Online" : "🔴 Offline"}
            </span>
            <span className="text-xs text-slate-500">₹{station.price_per_kwh}/kWh · {station.chargers?.length || 0} chargers</span>
          </div>
        </div>
        <p className="text-xs text-slate-600 italic">My Station Only</p>
      </div>

      {/* Stat Cards — all from THIS station only */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="My Revenue"       value={`₹${revenue.toFixed(0)}`}         icon="bolt"     color="#00C4FF" />
        <StatCard label="Total Sessions"   value={completed.length}                  icon="booking"  color="#10b981" />
        <StatCard label="Energy Delivered" value={`${totalEnergy.toFixed(1)} kWh`}   icon="bolt"     color="#a78bfa" />
        <StatCard label="Avg per Session"  value={`₹${avgPerSession.toFixed(0)}`}    icon="analytics" color="#f59e0b" />
      </div>

      {/* Booking Status Breakdown */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Completed", count: completed.length, color: "#10b981" },
          { label: "Upcoming",  count: upcoming.length,  color: "#60a5fa" },
          { label: "Cancelled", count: cancelled.length, color: "#ef4444" },
        ].map(s => (
          <GlassCard key={s.label} className="p-4 text-center">
            <p className="text-3xl font-black" style={{ color: s.color }}>{s.count}</p>
            <p className="text-slate-400 text-xs mt-1">{s.label} Bookings</p>
          </GlassCard>
        ))}
      </div>

      {/* Monthly Revenue Chart */}
      <GlassCard className="p-6">
        <h3 className="font-bold text-white mb-1">Monthly Revenue</h3>
        <p className="text-slate-500 text-xs mb-6">{station.name} — Last 6 Months</p>
        <div className="flex items-end gap-3 h-40">
          {months.map((m, i) => (
            <div key={m} className="flex-1 flex flex-col items-center gap-2">
              <p className="text-xs text-slate-400 font-medium">
                {monthlyRev[i] > 0 ? `₹${monthlyRev[i].toFixed(0)}` : "—"}
              </p>
              <div className="w-full rounded-t-xl transition-all duration-700 relative overflow-hidden"
                style={{ height: `${Math.max(8, (monthlyRev[i] / maxRev) * 120)}px`, background: "linear-gradient(180deg,#0066FF,#00C4FF)", opacity: monthlyRev[i] === 0 ? 0.2 : 1 }}>
                <div className="absolute inset-0 opacity-30" style={{ background: "linear-gradient(180deg,rgba(255,255,255,0.3),transparent)" }} />
              </div>
              <p className="text-xs text-slate-500">{m}</p>
              <p className="text-xs text-slate-600">{monthlySessions[i]} sessions</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Charger Performance */}
      <GlassCard className="p-6">
        <h3 className="font-bold text-white mb-4">Charger Performance</h3>
        <div className="space-y-3">
          {chargerStats.map(c => (
            <div key={c.id} className="flex items-center gap-4 p-4 rounded-xl border border-white/10"
              style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#0066FF,#00C4FF)" }}>#{c.id}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-white font-semibold text-sm">{c.type} · {c.power}kW</p>
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: `${statusColors[c.status] || "#94a3b8"}20`, color: statusColors[c.status] || "#94a3b8" }}>
                    {c.status}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div className="h-full rounded-full"
                      style={{ width: `${completed.length > 0 ? (c.sessions / completed.length) * 100 : 0}%`, background: "linear-gradient(90deg,#0066FF,#00C4FF)" }} />
                  </div>
                  <span className="text-xs text-slate-500">
                    {completed.length > 0 ? ((c.sessions / completed.length) * 100).toFixed(0) : 0}% usage
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center text-xs flex-shrink-0">
                {[
                  { l: "Sessions", v: c.sessions },
                  { l: "Revenue",  v: `₹${c.revenue.toFixed(0)}` },
                  { l: "Energy",   v: `${c.energy.toFixed(1)}kWh` },
                ].map(s => (
                  <div key={s.l}>
                    <p className="text-white font-bold">{s.v}</p>
                    <p className="text-slate-500">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Recent Bookings */}
      <GlassCard className="p-6">
        <h3 className="font-bold text-white mb-4">Recent Bookings</h3>
        {recentBookings.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-6">No bookings yet</p>
        ) : (
          <div className="space-y-3">
            {recentBookings.map(b => (
              <div key={b._id} className="flex items-center gap-4 p-3 rounded-xl border border-white/10"
                style={{ background: "rgba(255,255,255,0.02)" }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-white text-sm font-semibold">{b.userId?.name || "User"}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: `${bookingStatusColor[b.status] || "#94a3b8"}18`, color: bookingStatusColor[b.status] || "#94a3b8" }}>
                      {b.status}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs">Charger #{b.chargerId} · {b.timeSlot} · {b.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-cyan-400 font-bold text-sm">₹{b.totalCost}</p>
                  <p className="text-slate-500 text-xs">{b.energyKwh} kWh</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Facilities */}
      {station.facilities?.length > 0 && (
        <GlassCard className="p-6">
          <h3 className="font-bold text-white mb-4">Station Facilities</h3>
          <div className="flex flex-wrap gap-2">
            {station.facilities.map(f => (
              <span key={f} className="text-sm px-3 py-1.5 rounded-full border border-cyan-400/20 text-cyan-400"
                style={{ background: "rgba(0,196,255,0.08)" }}>✓ {f}</span>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
};

export default ManagerAnalytics;
