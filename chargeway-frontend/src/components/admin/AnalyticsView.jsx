import React from 'react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api, API_BASE, getToken } from '../../api/api';
import { GlassCard, Btn, Alert, Spinner, StatCard } from '../ui/index';
import { Sparkline, BarChart } from '../ui/Charts';
import Icon from '../ui/Icon';

const CO2_PER_KWH = 0.82;

const AnalyticsView = ({ isAdmin, user }) => {
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await api.get("/analytics");
      if (res.ok) setData(res.data);
      setLoading(false);
    })();
  }, []);

  const downloadExcel = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`${API_BASE}/report/excel`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error("Report failed");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `ChargeWay_Report_${new Date().toISOString().split("T")[0]}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    } catch (err) { alert("Failed to download report: " + err.message); }
    setDownloading(false);
  };

  if (loading) return <Spinner text="Loading analytics..." />;
  if (!data)   return <Alert message="Could not load analytics." />;

  const { months, monthlyRevenue, monthlySessions, monthlyUsers, stationRevenue, totals } = data;
  const maxRev = Math.max(...Object.values(stationRevenue || {}), 1);

  // CO₂ calculation from total energy
  const totalEnergy = totals?.energy || 0;
  const totalCO2kg  = (totalEnergy * CO2_PER_KWH).toFixed(0);
  const totalCO2t   = (totalEnergy * CO2_PER_KWH / 1000).toFixed(2);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-black text-white">Analytics</h2>
        {isAdmin && (
          <Btn variant="success" onClick={downloadExcel} loading={downloading} className="gap-2">
            <Icon name="excel" className="w-4 h-4" />Generate Excel Report
          </Btn>
        )}
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Revenue"  value={`₹${((totals?.revenue || 0) / 1000).toFixed(1)}K`} icon="bolt"     color="#00C4FF" />
        <StatCard label="Total Users"    value={totals?.users    || 0}                              icon="users"    color="#60a5fa" />
        <StatCard label="Total Bookings" value={totals?.bookings || 0}                              icon="booking"  color="#a78bfa" />
        <StatCard label="Stations"       value={totals?.stations || 0}                              icon="stations" color="#10b981" />
      </div>

      {/* CO₂ Impact Banner */}
      <div className="rounded-2xl p-6 border border-green-400/20"
        style={{ background: "linear-gradient(135deg,rgba(16,185,129,0.08),rgba(5,150,105,0.05))" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}>🌿</div>
          <div>
            <h3 className="font-black text-white">Green Impact — CO₂ Saved</h3>
            <p className="text-slate-500 text-xs">By charging EVs vs petrol vehicles (0.82 kg CO₂/kWh)</p>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Energy Delivered", value: `${totalEnergy.toFixed ? Number(totalEnergy).toFixed(1) : totalEnergy} kWh`, color: "#00C4FF" },
            { label: "CO₂ Saved",              value: `${totalCO2kg} kg`,                                                           color: "#10b981" },
            { label: "In Tonnes",              value: `${totalCO2t} t`,                                                             color: "#34d399" },
            { label: "Trees Equivalent",       value: `~${Math.round(totalCO2kg / 21)} trees`,                                      color: "#6ee7b7", note: "1 tree absorbs ~21 kg CO₂/yr" },
          ].map(item => (
            <div key={item.label} className="p-4 rounded-xl text-center"
              style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(16,185,129,0.15)" }}>
              <p className="font-black text-2xl" style={{ color: item.color }}>{item.value}</p>
              <p className="text-slate-400 text-xs mt-1">{item.label}</p>
              {item.note && <p className="text-slate-600 text-xs mt-0.5">{item.note}</p>}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="p-6 lg:col-span-2">
          <h3 className="font-bold text-white mb-1">Monthly Revenue</h3>
          <p className="text-slate-500 text-xs mb-4">Real data from database</p>
          <Sparkline data={monthlyRevenue} color="#00C4FF" height={70} />
          <BarChart data={monthlyRevenue.map(v => v / 100)} labels={months} color="#0066FF" />
        </GlassCard>
        <GlassCard className="p-6">
          <h3 className="font-bold text-white mb-4">Revenue by Station</h3>
          <div className="space-y-4">
            {Object.entries(stationRevenue || {}).map(([name, rev]) => (
              <div key={name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 truncate max-w-[130px]">{name}</span>
                  <span className="text-cyan-400 font-bold">₹{rev.toFixed(0)}</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg,#0066FF,#00C4FF)" }}
                    initial={{ width: 0 }} animate={{ width: `${(rev / maxRev) * 100}%` }} transition={{ duration: 1 }} />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="p-6">
          <h3 className="font-bold text-white mb-4">User Growth</h3>
          <Sparkline data={monthlyUsers} color="#60a5fa" height={80} />
          <div className="flex justify-between mt-2 text-xs text-slate-500"><span>{months[0]}</span><span>{months[months.length - 1]}</span></div>
        </GlassCard>
        <GlassCard className="p-6">
          <h3 className="font-bold text-white mb-4">Sessions per Month</h3>
          <Sparkline data={monthlySessions} color="#a78bfa" height={80} />
          <div className="flex justify-between mt-2 text-xs text-slate-500"><span>{months[0]}</span><span>{months[months.length - 1]}</span></div>
        </GlassCard>
      </div>
    </div>
  );
};

export default AnalyticsView;