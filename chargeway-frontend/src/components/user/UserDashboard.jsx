import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../api/api';
import { GlassCard, Btn } from '../ui/index';
import Icon from '../ui/Icon';

const UserDashboard = ({ user, setActiveView, activeBooking, onCancelBooking }) => {
  const { car } = user;
  const [spending, setSpending] = useState(null);
  const [loadingSpend, setLoadingSpend] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await api.get("/bookings/spending");
      if (res.ok) setSpending(res.data);
      setLoadingSpend(false);
    })();
  }, []);

  const maxSpend = spending ? Math.max(...spending.spending, 1) : 1;

  // Always use the image URL directly — never wrap in serverImg()
  const carImageSrc = car?.image?.startsWith('http')
    ? car.image
    : `https://placehold.co/600x300/0A1628/00C4FF?text=${encodeURIComponent((car?.brand || "") + "+" + (car?.model || ""))}`;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Car Card */}
        <div className="lg:col-span-2">
          <GlassCard className="relative overflow-hidden h-full">
            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 70% 50%, #00C4FF 0%, transparent 60%)" }} />

            {/* Full car image at top */}
            <div className="w-full h-52 overflow-hidden bg-slate-900/80">
              <img
                src={carImageSrc}
                alt={`${car?.brand} ${car?.model}`}
                className="w-full h-full object-contain p-4"
                onError={e => {
                  e.target.src = `https://placehold.co/600x300/0A1628/00C4FF?text=${encodeURIComponent((car?.brand || "") + "+" + (car?.model || ""))}`;
                }}
              />
            </div>

            <div className="relative z-10 p-6">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <p className="text-slate-400 text-sm">Your Vehicle</p>
                  <h2 className="text-3xl font-black text-white">{car?.brand} {car?.model}</h2>
                  <p className="font-mono text-cyan-400 text-xl mt-1">{car?.vehicleNumber}</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: "rgba(16,185,129,0.15)", border: "2px solid rgba(16,185,129,0.4)" }}>
                    <span className="text-xl font-black text-green-400">{car?.battery || 85}%</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Battery</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { l: "Range",      v: `${car?.range_km || 0} km`       },
                  { l: "Battery",    v: `${car?.battery_kwh || 0} kWh`   },
                  { l: "Efficiency", v: `${car?.efficiency || 0} km/kWh` },
                ].map(i => (
                  <div key={i.l} className="p-3 rounded-xl text-center" style={{ background: "rgba(0,196,255,0.05)" }}>
                    <p className="text-cyan-400 font-bold text-sm">{i.v}</p>
                    <p className="text-slate-500 text-xs">{i.l}</p>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Quick Actions / Active Booking */}
        <div className="space-y-4">
          {activeBooking ? (
            <GlassCard className="p-5" style={{ borderColor: "rgba(0,196,255,0.3)" }}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-cyan-400">Active Booking</h3>
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              </div>
              <p className="text-white font-semibold">{activeBooking.stationName}</p>
              <p className="text-slate-400 text-sm">{activeBooking.timeSlot} · Charger #{activeBooking.chargerId}</p>
              <p className="text-cyan-400 font-bold mt-1">₹{activeBooking.totalCost}</p>
              <Btn variant="danger" onClick={onCancelBooking} className="w-full mt-3 text-sm py-2">Cancel Booking</Btn>
            </GlassCard>
          ) : (
            <GlassCard className="p-5">
              <h3 className="font-bold text-slate-300 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                {[
                  { icon: "stations", label: "Find Stations", view: "findstations", color: "#00C4FF" },
                  { icon: "booking",  label: "My Bookings",   view: "bookings",     color: "#60a5fa" },
                  { icon: "invoices", label: "Invoices",      view: "invoices",     color: "#a78bfa" },
                  { icon: "user",     label: "My Profile",    view: "profile",      color: "#34d399" },
                ].map(a => (
                  <button key={a.view} onClick={() => setActiveView(a.view)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-sm font-medium border border-white/5 hover:border-white/15 transition-all"
                    style={{ background: "rgba(255,255,255,0.03)" }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${a.color}20` }}>
                      <Icon name={a.icon} className="w-4 h-4" style={{ color: a.color }} />
                    </div>
                    <span className="text-white">{a.label}</span>
                  </button>
                ))}
              </div>
            </GlassCard>
          )}
        </div>
      </div>

      {/* Spending History Graph */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-white text-lg">My Spending History</h3>
            <p className="text-slate-500 text-xs mt-0.5">Last 6 months</p>
          </div>
          {spending && (
            <div className="flex gap-4 text-right">
              <div>
                <p className="text-cyan-400 font-black text-xl">₹{spending.totals.spent.toFixed(0)}</p>
                <p className="text-slate-500 text-xs">Total Spent</p>
              </div>
              <div>
                <p className="text-green-400 font-black text-xl">{spending.totals.energy.toFixed(1)}</p>
                <p className="text-slate-500 text-xs">kWh Used</p>
              </div>
              <div>
                <p className="text-purple-400 font-black text-xl">{spending.totals.sessions}</p>
                <p className="text-slate-500 text-xs">Sessions</p>
              </div>
            </div>
          )}
        </div>

        {loadingSpend ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : spending && spending.spending.some(v => v > 0) ? (
          <>
            <div className="flex items-end gap-3 h-40 mb-2">
              {spending.months.map((m, i) => (
                <div key={m} className="flex-1 flex flex-col items-center gap-2">
                  {spending.spending[i] > 0 && (
                    <p className="text-xs text-slate-400 font-medium">₹{spending.spending[i].toFixed(0)}</p>
                  )}
                  <motion.div className="w-full rounded-t-xl relative overflow-hidden"
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(8, (spending.spending[i] / maxSpend) * 130)}px` }}
                    transition={{ delay: i * 0.08, duration: 0.6 }}
                    style={{
                      background: spending.spending[i] > 0 ? "linear-gradient(180deg,#0066FF,#00C4FF)" : "rgba(255,255,255,0.05)",
                      opacity: spending.spending[i] === 0 ? 0.3 : 1
                    }}>
                    {spending.spending[i] > 0 && (
                      <div className="absolute inset-0 opacity-30" style={{ background: "linear-gradient(180deg,rgba(255,255,255,0.3),transparent)" }} />
                    )}
                  </motion.div>
                  <p className="text-xs text-slate-500">{m}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-white/5">
              <p className="text-xs text-slate-500 mb-2">Energy used per month (kWh)</p>
              <div className="flex items-center gap-3">
                {spending.months.map((m, i) => (
                  <div key={m} className="flex-1 text-center">
                    <p className="text-xs font-semibold text-green-400">{spending.energy[i] > 0 ? spending.energy[i].toFixed(1) : "—"}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-10">
            <p className="text-4xl mb-3">📊</p>
            <p className="text-slate-400 text-sm">No charging sessions yet.</p>
            <button onClick={() => setActiveView("findstations")} className="text-cyan-400 text-sm mt-2 hover:text-cyan-300">
              Find a station to charge →
            </button>
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default UserDashboard;