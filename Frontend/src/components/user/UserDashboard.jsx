import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { api } from '../../api/api';
import { GlassCard, Btn, Badge, CardSkeleton } from '../ui/index';
import Icon from '../ui/Icon';
import VehicleVisual from '../vehicle/VehicleVisual';
import { isPeakHour, getPricingContext } from '../../utils/pricing';

const CHART_TOOLTIP_STYLE = {
  background: "rgba(15,25,45,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
  fontSize: 12, color: "#fff", padding: "8px 12px",
};

const StatCard = ({ icon, iconColor, label, value, delta, deltaColor = "text-green-400", sub }) => (
  <GlassCard className="p-5">
    <div className="flex items-center gap-2.5 mb-4">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${iconColor}20` }}>
        <Icon name={icon} className="w-4 h-4" style={{ color: iconColor }} />
      </div>
      <p className="text-slate-400 text-sm">{label}</p>
    </div>
    <p className="text-3xl font-black text-white cw-figure">{value}</p>
    {delta && <p className={`text-xs mt-1.5 flex items-center gap-1 ${deltaColor}`}>{delta}</p>}
    {sub && <p className="text-xs mt-1.5 flex items-center gap-1.5 text-green-400"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />{sub}</p>}
  </GlassCard>
);

// Real lifecycle timeline — Booked → Arrived & Verified → Charging → Done —
// driven entirely by actual booking fields (createdAt, checkedInAt,
// chargingStartedAt), not a decorative progress bar. Each step only shows
// as reached once its underlying event has actually happened.
const BookingTimeline = ({ booking, onCancel, setActiveView }) => {
  const steps = [
    { key: "booked",  label: "Booked",           at: booking.createdAt,         icon: "booking" },
    { key: "arrived", label: "Arrived & Verified", at: booking.checkedInAt,     icon: "check" },
    { key: "charging", label: "Charging",         at: booking.chargingStartedAt, icon: "bolt" },
    { key: "done",    label: "Complete",          at: booking.status === "Completed" ? (booking.completedAt || booking.updatedAt) : null, icon: "check" },
  ];
  const reachedIdx = steps.reduce((acc, s, i) => (s.at ? i : acc), 0);
  const fmtTime = (d) => d ? new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-card text-white">Your Session</h3>
          <p className="text-slate-400 text-sm">{booking.stationName} · Charger #{booking.chargerId}</p>
        </div>
        {!booking.chargingStartedAt && (
          <button onClick={onCancel} className="text-xs font-semibold text-red-400 hover:text-red-300">Cancel</button>
        )}
      </div>

      <div className="flex items-center">
        {steps.map((s, i) => (
          <React.Fragment key={s.key}>
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0" style={{ width: 84 }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: i <= reachedIdx ? "linear-gradient(135deg,#5B47E0,#FF8A3D)" : "rgba(255,255,255,0.06)",
                  boxShadow: i === reachedIdx && i < 3 ? "0 0 14px rgba(255,138,61,0.4)" : "none",
                }}>
                {i < reachedIdx || (i === 3 && s.at) ? (
                  <Icon name="check" className="w-4 h-4 text-white" />
                ) : i === reachedIdx ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-white cw-pulse-dot" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-600" />
                )}
              </div>
              <p className="text-[11px] text-center font-medium leading-tight" style={{ color: i <= reachedIdx ? "#fff" : "#64748b" }}>{s.label}</p>
              {s.at && <p className="text-[10px] text-slate-500 cw-figure">{fmtTime(s.at)}</p>}
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 h-[2px] -mt-5" style={{ background: i < reachedIdx ? "linear-gradient(90deg,#5B47E0,#FF8A3D)" : "rgba(255,255,255,0.08)" }} />
            )}
          </React.Fragment>
        ))}
      </div>

      {!booking.checkedInAt && (
        <div className="mt-5 p-4 rounded-xl text-center" style={{ background: "rgba(255,138,61,0.06)", border: "1px solid rgba(255,138,61,0.15)" }}>
          <p className="text-slate-400 text-xs mb-1">Give this PIN to station staff to start charging</p>
          <p className="text-3xl font-black text-[#FF8A3D] cw-figure tracking-[0.25em]">{booking.checkInOtp}</p>
        </div>
      )}
      {booking.chargingStartedAt && booking.status !== "Completed" && (
        <button onClick={() => setActiveView("livesession")}
          className="mt-5 w-full py-2.5 rounded-xl text-sm font-semibold text-white text-center"
          style={{ background: "linear-gradient(135deg,#5B47E0,#FF8A3D)" }}>
          View Live Session →
        </button>
      )}
    </GlassCard>
  );
};

// A ring gauge for battery HEALTH — a real, user-declared vehicle
// attribute (pack condition), not a live charge reading. ChargeWay has no
// telemetry connection to any vehicle, so this must never be used to show
// a "current charge %" — that was a hardcoded, never-updating fake value
// removed from CarSelection.jsx / AddVehicleModal.jsx.
const BatteryHealthGauge = ({ pct, size = 44 }) => (
  <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
    <svg viewBox="0 0 44 44" style={{ width: size, height: size }} className="-rotate-90">
      <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
      <circle cx="22" cy="22" r="18" fill="none" stroke={pct < 60 ? "#f59e0b" : "#22c55e"} strokeWidth="4" strokeLinecap="round"
        strokeDasharray={`${(pct ?? 100) * 1.13} 113`} />
    </svg>
    <span className="absolute inset-0 flex items-center justify-center cw-figure text-[10px] font-semibold text-white">{pct ?? 100}%</span>
  </div>
);

const MyVehiclesWidget = ({ user, car, setActiveView }) => {
  const [open, setOpen] = useState(false);
  const vehicles = user.cars?.length > 0 ? user.cars : (car ? [car] : []);
  const primary = vehicles.find(v => v.isFavorite) || car || vehicles[0];
  if (!primary) return null;

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/[0.06] transition-all"
        style={{ background: "rgba(255,255,255,0.04)" }}>
        <span title="Battery health (pack condition) — not a live charge reading">
          <BatteryHealthGauge pct={primary.batteryHealth} />
        </span>
        <div className="text-left">
          <p className="text-xs text-slate-500">{primary.nickname || `${primary.brand || ""} ${primary.model || ""}`.trim() || "Your vehicle"}</p>
          <p className="text-sm font-semibold text-white flex items-center gap-1.5">
            My Vehicles {vehicles.length > 1 && <span className="text-[10px] text-slate-500 cw-figure">+{vehicles.length - 1} more</span>}
          </p>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500 ml-1 flex-shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-white/10 z-40 overflow-hidden"
            style={{ background: "rgba(15,25,45,0.98)", backdropFilter: "blur(20px)", boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}>
            <div className="max-h-72 overflow-y-auto">
              {vehicles.map((v, i) => (
                <div key={v.vehicleNumber || i} className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0">
                  <span title="Battery health — not a live charge reading">
                    <BatteryHealthGauge pct={v.batteryHealth} size={36} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{v.brand} {v.model}</p>
                    <p className="text-xs text-slate-500 cw-figure truncate">{v.vehicleNumber}</p>
                  </div>
                  {v.isFavorite && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-[#FF8A3D]" style={{ background: "rgba(255,138,61,0.12)" }}>Primary</span>}
                </div>
              ))}
            </div>
            <button onClick={() => { setOpen(false); setActiveView("vehicles"); }}
              className="w-full py-3 text-sm font-semibold text-[#FF8A3D] hover:bg-white/5 transition-all border-t border-white/5">
              + Manage Vehicles
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const UserDashboard = ({ user, setActiveView, activeBooking, onCancelBooking }) => {
  const { car } = user;
  const [bookings, setBookings] = useState([]);
  const [spending, setSpending] = useState(null);
  const [stations, setStations] = useState([]);
  const [platformConfig, setPlatformConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [bRes, sRes, stRes, pcRes] = await Promise.all([
        api.get("/bookings"), api.get("/bookings/spending"), api.get("/stations"), api.get("/platform-config"),
      ]);
      if (bRes.ok) setBookings(bRes.data.bookings);
      if (sRes.ok) setSpending(sRes.data);
      if (stRes.ok) setStations(stRes.data.stations || []);
      if (pcRes.ok) setPlatformConfig(pcRes.data.config);
      setLoading(false);
    })();
  }, []);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  // Haversine distance in km — used to surface the closest online station
  // as today's recommendation instead of just picking the first in the list.
  const nearestStation = useMemo(() => {
    const online = stations.filter(s => s.status !== "Offline" && s.chargers?.some(c => c.status === "Available"));
    if (online.length === 0) return null;
    if (!navigator.geolocation) return online[0];
    return online[0]; // geolocation resolves async below; this is the sync fallback
  }, [stations]);

  const [geoNearest, setGeoNearest] = useState(null);
  useEffect(() => {
    if (!navigator.geolocation || stations.length === 0) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const toRad = (d) => (d * Math.PI) / 180;
        const dist = (a, b, c, d) => {
          const R = 6371, dLat = toRad(c - a), dLng = toRad(d - b);
          const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a)) * Math.cos(toRad(c)) * Math.sin(dLng / 2) ** 2;
          return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
        };
        const online = stations.filter(s => s.status !== "Offline" && s.chargers?.some(c => c.status === "Available"));
        if (online.length === 0) return;
        const sorted = [...online].sort((s1, s2) =>
          dist(latitude, longitude, s1.lat, s1.lng) - dist(latitude, longitude, s2.lat, s2.lng)
        );
        setGeoNearest({ ...sorted[0], distanceKm: dist(latitude, longitude, sorted[0].lat, sorted[0].lng) });
      },
      () => { /* permission denied — silently fall back to the sync pick above */ }
    );
  }, [stations]);

  const recommendedStation = geoNearest || nearestStation;

  // ── Derived stats ────────────────────────────────────────────
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthKey = `${lastMonthDate.getFullYear()}-${lastMonthDate.getMonth()}`;

    const realBookings = bookings.filter(b => b.status !== "Cancelled");
    const countInMonth = (key) => realBookings.filter(b => {
      const d = new Date(b.createdAt);
      return `${d.getFullYear()}-${d.getMonth()}` === key;
    }).length;

    const thisMonthCount = countInMonth(thisMonthKey);
    const lastMonthCount = countInMonth(lastMonthKey);
    const bookingsDelta = lastMonthCount > 0 ? Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100) : (thisMonthCount > 0 ? 100 : 0);

    const liveCount = bookings.filter(b => b.status === "Upcoming").length;

    let spendDelta = 0, energyDelta = 0;
    if (spending?.spending?.length >= 2) {
      const cur = spending.spending[spending.spending.length - 1];
      const prev = spending.spending[spending.spending.length - 2];
      spendDelta = prev > 0 ? Math.round(((cur - prev) / prev) * 100) : (cur > 0 ? 100 : 0);
    }
    if (spending?.energy?.length >= 2) {
      const cur = spending.energy[spending.energy.length - 1];
      const prev = spending.energy[spending.energy.length - 2];
      energyDelta = prev > 0 ? Math.round(((cur - prev) / prev) * 100) : (cur > 0 ? 100 : 0);
    }

    return { thisMonthCount: realBookings.length, bookingsDelta, liveCount, spendDelta, energyDelta };
  }, [bookings, spending]);

  // ── Spending breakdown for the donut chart ──────────────────
  // Real cost components only — no invented "Taxes" bucket. Every booking
  // already stores exactly these three numbers server-side (see
  // Backend/routes/bookings.js), so this is a straight sum, not a guess:
  //   energy cost = costPerKwh * energyKwh, platformFee is flat,
  //   priceAdjustment is the UPI discount (negative) or Cash surcharge (positive).
  const [breakdownView, setBreakdownView] = useState("cost"); // "cost" | "network"
  const breakdown = useMemo(() => {
    const completed = bookings.filter(b => b.status === "Completed");
    if (breakdownView === "network") {
      const owned   = completed.filter(b => (b.networkTypeAtBooking || "Owned") === "Owned").reduce((s, b) => s + (b.totalCost || 0), 0);
      const partner = completed.filter(b => b.networkTypeAtBooking === "Partner").reduce((s, b) => s + (b.totalCost || 0), 0);
      return [
        { name: "ChargeWay Network", value: parseFloat(owned.toFixed(2)),   color: "#FF8A3D" },
        { name: "Partner Stations",  value: parseFloat(partner.toFixed(2)), color: "#a78bfa" },
      ].filter(d => d.value > 0);
    }
    const charging    = completed.reduce((s, b) => s + (b.energyKwh || 0) * (b.costPerKwh || 0), 0);
    const fees         = completed.reduce((s, b) => s + (b.platformFee || 0), 0);
    const discounts    = completed.reduce((s, b) => s + Math.min(0, b.priceAdjustment || 0), 0); // UPI discount, always <= 0
    const surcharges    = completed.reduce((s, b) => s + Math.max(0, b.priceAdjustment || 0), 0); // Cash surcharge, always >= 0
    return [
      { name: "Charging",       value: parseFloat(charging.toFixed(2)),          color: "#3b82f6" },
      { name: "Platform Fee",   value: parseFloat(fees.toFixed(2)),              color: "#a78bfa" },
      { name: "Cash Surcharge", value: parseFloat(surcharges.toFixed(2)),        color: "#f97316" },
      { name: "UPI Discount",   value: parseFloat(Math.abs(discounts).toFixed(2)), color: "#22c55e" },
    ].filter(d => d.value > 0);
  }, [bookings, breakdownView]);

  const recent = bookings.slice(0, 3);
  const liveBooking = bookings.find(b => b.status === "Upcoming");
  const totalSpent = spending?.totals?.spent ?? 0;
  const [activeSlice, setActiveSlice] = useState(null); // hovered donut segment index

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <CardSkeleton key={i} />)}
        </div>
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Hero: greeting, vehicle battery, today's recommendation ── */}
      <GlassCard className="p-6 sm:p-7 relative overflow-hidden"
        style={{ background: "linear-gradient(120deg, rgba(91,71,224,0.12), rgba(255,138,61,0.05))" }}>
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, #FF8A3D, transparent 70%)" }} />
        <div className="relative flex flex-col lg:flex-row lg:items-center gap-6 justify-between">
          <div>
            <h1 className="text-page text-white">{greeting}, {user?.name?.split(" ")[0]} 👋</h1>
            <p className="text-slate-400 text-sm mt-1">
              {stats.liveCount > 0 ? "You have a session in progress." : "Ready for your next charge?"}
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            {/* My Vehicles — real multi-vehicle summary, not a single static gauge */}
            {(user.cars?.length > 0 || car) && (
              <MyVehiclesWidget user={user} car={car} setActiveView={setActiveView} />
            )}

            {/* Nearest station recommendation — with live peak/off-peak rate */}
            {recommendedStation && (
              <button onClick={() => setActiveView("findstations")}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-left hover:bg-white/[0.06] transition-all"
                style={{ background: "rgba(255,255,255,0.04)" }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,138,61,0.12)" }}>
                  <Icon name="stations" className="w-5 h-5 text-[#FF8A3D]" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">
                    {geoNearest ? `${geoNearest.distanceKm.toFixed(1)} km away` : "Recommended for you"}
                  </p>
                  <p className="text-sm font-semibold text-white truncate max-w-[160px]">{recommendedStation.name}</p>
                  {recommendedStation.peakPricing?.enabled && (
                    <p className="text-xs mt-0.5 flex items-center gap-1"
                      style={{ color: isPeakHour(new Date().getHours(), recommendedStation.peakPricing) ? "#f59e0b" : "#22c55e" }}>
                      {isPeakHour(new Date().getHours(), recommendedStation.peakPricing) ? "⚡ Peak now" : "🌙 Off-peak — save now"}
                      <span className="text-slate-500 cw-figure">
                        · ₹{platformConfig ? getPricingContext(recommendedStation, null, platformConfig).pricePerKwh : recommendedStation.price_per_kwh}/kWh
                      </span>
                    </p>
                  )}
                </div>
              </button>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Active booking — real lifecycle timeline, not decorative */}
      {activeBooking && (
        <BookingTimeline booking={activeBooking} onCancel={onCancelBooking} setActiveView={setActiveView} />
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="booking" iconColor="#818cf8" label="Total Bookings" value={stats.thisMonthCount}
          delta={stats.bookingsDelta !== 0 && <>{stats.bookingsDelta > 0 ? "↑" : "↓"} {Math.abs(stats.bookingsDelta)}% this month</>}
          deltaColor={stats.bookingsDelta >= 0 ? "text-green-400" : "text-red-400"} />
        <StatCard icon="battery" iconColor="#38bdf8" label="Live Sessions" value={stats.liveCount}
          sub={stats.liveCount > 0 ? "Ongoing" : "None active"} />
        <StatCard icon="wallet" iconColor="#a78bfa" label="Total Spent" value={`₹${totalSpent.toFixed(0)}`}
          delta={stats.spendDelta !== 0 && <>{stats.spendDelta > 0 ? "↑" : "↓"} {Math.abs(stats.spendDelta)}% this month</>}
          deltaColor={stats.spendDelta >= 0 ? "text-green-400" : "text-red-400"} />
        <StatCard icon="shield" iconColor="#4ade80" label="CO₂ Saved" value={`${((spending?.totals?.energy ?? 0) * 0.82).toFixed(1)} kg`}
          delta={stats.energyDelta !== 0 && <>{stats.energyDelta > 0 ? "↑" : "↓"} {Math.abs(stats.energyDelta)}% this month</>}
          deltaColor={stats.energyDelta >= 0 ? "text-green-400" : "text-red-400"} />
      </div>

      {/* Live Session + Recent Bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-card text-white">Live Session</h3>
            {liveBooking && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Active
              </span>
            )}
          </div>

          {!liveBooking ? (
            <div className="text-center py-10">
              <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-3" style={{ background: "rgba(255,138,61,0.08)" }}>
                <Icon name="battery" className="w-7 h-7 text-[#FF8A3D]" />
              </div>
              <p className="text-white font-semibold text-sm">No active session</p>
              <p className="text-slate-500 text-xs mt-1 mb-4">Start charging to see it live here.</p>
              <Btn onClick={() => setActiveView("findstations")}>Find a Charger →</Btn>
            </div>
          ) : (
            <>
              <p className="font-bold text-white">{liveBooking.stationName || liveBooking.stationId?.name}</p>
              <p className="text-slate-500 text-xs mb-4 flex items-center gap-1">
                <Icon name="stations" className="w-3.5 h-3.5" /> {liveBooking.stationId?.address || "—"}
              </p>
              <div className="grid grid-cols-2 gap-4 items-center">
                <div className="h-32 rounded-xl overflow-hidden" style={{ background: "rgba(255,138,61,0.04)" }}>
                  <VehicleVisual color={car?.color} connectorType={car?.connectorType} size="sm" charging />
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-slate-500 text-xs">Energy Delivered</p>
                    <p className="text-lg font-bold text-[#FF8A3D]">{liveBooking.energyKwh} kWh</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Amount</p>
                    <p className="text-lg font-bold text-white">₹{liveBooking.totalCost}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <Btn variant="outline" onClick={() => setActiveView("livesession")} className="flex-1 text-sm">View Details</Btn>
                <Btn variant="danger" onClick={onCancelBooking} className="flex-1 text-sm">End Session</Btn>
              </div>
            </>
          )}
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-card text-white">Recent Bookings</h3>
            <button onClick={() => setActiveView("bookings")} className="text-xs font-semibold text-[#FF8A3D] hover:text-[#FFAB70]">View all</button>
          </div>
          {recent.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-10">No bookings yet.</p>
          ) : (
            <div className="space-y-3">
              {recent.map(b => (
                <div key={b._id} className="flex items-center gap-3 pb-3 border-b border-white/5 last:border-0 last:pb-0">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,138,61,0.08)" }}>
                    <Icon name="stations" className="w-4 h-4 text-[#FF8A3D]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{b.stationName || b.stationId?.name}</p>
                    <p className="text-xs text-slate-500">{b.date}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-white">₹{b.totalCost}</p>
                    <Badge color={b.status === "Completed" ? "green" : b.status === "Upcoming" ? "blue" : "red"}>{b.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Monthly Overview + Spending Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-card text-white">Monthly Overview</h3>
            <span className="text-xs text-slate-500 px-2.5 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>This Month</span>
          </div>
          {spending && spending.spending.some(v => v > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={spending.months.map((m, i) => ({ month: m, spend: spending.spending[i] }))} margin={{ left: -20, right: 10, top: 10 }}>
                <defs>
                  <linearGradient id="cwSpendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF8A3D" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#FF8A3D" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v) => [`₹${v}`, "Spent"]} />
                <Area type="monotone" dataKey="spend" stroke="#FF8A3D" strokeWidth={2.5} fill="url(#cwSpendGrad)" dot={{ fill: "#FF8A3D", r: 3 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-16">
              <p className="text-slate-500 text-sm">No spending data yet this period.</p>
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="text-card text-white">Spending Overview</h3>
            <div className="flex rounded-lg p-0.5" style={{ background: "rgba(255,255,255,0.04)" }}>
              {[{ k: "cost", l: "By Cost Type" }, { k: "network", l: "By Network" }].map(v => (
                <button key={v.k} onClick={() => { setBreakdownView(v.k); setActiveSlice(null); }}
                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all"
                  style={{ background: breakdownView === v.k ? "rgba(255,138,61,0.15)" : "transparent", color: breakdownView === v.k ? "#FF8A3D" : "#64748b" }}>
                  {v.l}
                </button>
              ))}
            </div>
          </div>
          {breakdown.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-slate-500 text-sm">No completed sessions yet.</p>
            </div>
          ) : (
            <div className="flex items-center gap-6 flex-wrap sm:flex-nowrap">
              <motion.div key={breakdownView} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }}
                className="relative flex-shrink-0" style={{ width: 160, height: 160 }}
                onMouseLeave={() => setActiveSlice(null)}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <defs>
                      {breakdown.map(d => (
                        <linearGradient key={d.name} id={`slice-${d.name.replace(/\s+/g, '')}`} x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor={d.color} stopOpacity={1} />
                          <stop offset="100%" stopColor={d.color} stopOpacity={0.65} />
                        </linearGradient>
                      ))}
                    </defs>
                    <Pie data={breakdown} dataKey="value" nameKey="name" innerRadius={50} outerRadius={78} paddingAngle={3} stroke="none"
                      isAnimationActive animationDuration={600} animationEasing="ease-out"
                      onMouseEnter={(_, i) => setActiveSlice(i)}>
                      {breakdown.map((d, i) => (
                        <Cell key={d.name} fill={`url(#slice-${d.name.replace(/\s+/g, '')})`}
                          style={{
                            filter: activeSlice === i ? `drop-shadow(0 0 8px ${d.color}99)` : "none",
                            transform: activeSlice === i ? "scale(1.045)" : "scale(1)",
                            transformOrigin: "center",
                            transition: "transform 0.2s ease, filter 0.2s ease",
                            cursor: "pointer",
                          }} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v) => [`₹${v.toFixed(0)}`, ""]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <AnimatePresence mode="wait">
                    {activeSlice != null && breakdown[activeSlice] ? (
                      <motion.div key={breakdown[activeSlice].name} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }} className="text-center px-2">
                        <p className="text-lg font-black text-white cw-figure">₹{breakdown[activeSlice].value.toFixed(0)}</p>
                        <p className="text-[10px] text-slate-400 truncate max-w-[110px]">{breakdown[activeSlice].name}</p>
                      </motion.div>
                    ) : (
                      <motion.div key="total" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }} className="text-center">
                        <p className="text-xl font-black text-white cw-figure">₹{breakdown.reduce((s, d) => s + d.value, 0).toFixed(0)}</p>
                        <p className="text-xs text-slate-500">Total</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
              <div className="space-y-2.5 flex-1 min-w-[140px]">
                {breakdown.map((d, i) => {
                  const sum = breakdown.reduce((s, x) => s + x.value, 0) || 1;
                  return (
                    <motion.div key={d.name} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25, delay: i * 0.06 }}
                      onMouseEnter={() => setActiveSlice(i)} onMouseLeave={() => setActiveSlice(null)}
                      className="flex items-center justify-between gap-3 rounded-lg px-1.5 py-1 -mx-1.5 transition-colors cursor-default"
                      style={{ background: activeSlice === i ? "rgba(255,255,255,0.05)" : "transparent" }}>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-transform" style={{ background: d.color, transform: activeSlice === i ? "scale(1.3)" : "scale(1)" }} />
                        <span className="text-sm text-slate-300">{d.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-white">₹{d.value.toFixed(0)} <span className="text-slate-500">({Math.round((d.value / sum) * 100)}%)</span></span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
};

export default UserDashboard;
