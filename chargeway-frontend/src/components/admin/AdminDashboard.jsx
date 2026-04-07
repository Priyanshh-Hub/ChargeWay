import React from 'react';
import { useState, useEffect } from 'react';
import { api } from '../../api/api';
import { GlassCard, Btn, Badge, Spinner, StatCard } from '../ui/index';
import Icon from '../ui/Icon';

const AdminDashboard = ({ user, setActiveView }) => {
  const [stats,    setStats]    = useState(null);
  const [stations, setStations] = useState([]);
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    (async () => {
      const [aRes, sRes, uRes] = await Promise.all([api.get("/analytics"), api.get("/stations"), api.get("/users")]);
      if (aRes.ok) setStats(aRes.data.totals);
      if (sRes.ok) setStations(sRes.data.stations);
      if (uRes.ok) setUsers(uRes.data.users);
      setLoading(false);
    })();
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-black text-white">Admin Overview</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users"    value={stats?.users    || 0}                              icon="users"    color="#60a5fa" />
        <StatCard label="Stations"       value={stats?.stations || 0}                              icon="stations" color="#00C4FF" />
        <StatCard label="Total Bookings" value={stats?.bookings || 0}                              icon="booking"  color="#a78bfa" />
        <StatCard label="Revenue"        value={`₹${((stats?.revenue || 0) / 1000).toFixed(1)}K`} icon="bolt"     color="#10b981" />
      </div>
      <div className="flex gap-3 flex-wrap">
        <Btn onClick={() => setActiveView("analytics")}     variant="success" className="gap-2"><Icon name="analytics" className="w-4 h-4" />Analytics & Excel Report</Btn>
        <Btn onClick={() => setActiveView("adminStations")} variant="outline" className="gap-2"><Icon name="stations"  className="w-4 h-4" />Manage Stations</Btn>
        <Btn onClick={() => setActiveView("adminUsers")}    variant="ghost"   className="gap-2"><Icon name="users"     className="w-4 h-4" />All Users</Btn>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="p-6">
          <h3 className="font-bold text-white mb-4">Recent Users</h3>
          <div className="space-y-3">
            {users.slice(0, 6).map(u => (
              <div key={u._id} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0" style={{ background: "linear-gradient(135deg,#0066FF,#00C4FF)" }}>{u.name[0]}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{u.name}</p>
                  <p className="text-xs text-slate-400 truncate">{u.email}</p>
                </div>
                <Badge color={u.role === "Admin" ? "orange" : u.role === "Station Manager" ? "purple" : "blue"}>{u.role === "Station Manager" ? "Manager" : u.role}</Badge>
              </div>
            ))}
          </div>
        </GlassCard>
        <GlassCard className="p-6">
          <h3 className="font-bold text-white mb-4">Station Status</h3>
          <div className="space-y-3">
            {stations.map(s => (
              <div key={s._id} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.status === "Online" ? "bg-green-400" : "bg-red-400"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{s.name}</p>
                  <p className="text-xs text-slate-400 truncate">{s.address}</p>
                </div>
                <div className="text-right text-xs">
                  <p className="text-green-400">{s.chargers?.filter(c => c.status === "Available").length || 0} avail</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default AdminDashboard;
