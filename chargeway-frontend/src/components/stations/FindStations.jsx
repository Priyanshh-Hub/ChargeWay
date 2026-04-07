import React, { useState, useEffect } from 'react';
import { api, serverImg } from '../../api/api';
import { Badge, Spinner } from '../ui/index';
import Icon from '../ui/Icon';
import MapView from './MapView';

const navigateToStation = (station) => {
  if (station.lat && station.lng) {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}&travelmode=driving`, '_blank');
  } else if (station.address) {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(station.address)}&travelmode=driving`, '_blank');
  }
};

const FindStations = ({ activeBooking, onViewStation }) => {
  const [stations,   setStations]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [filters,    setFilters]    = useState({ status: "All", minPrice: "", maxPrice: "", chargerType: "All" });
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await api.get("/stations");
      if (res.ok) setStations(res.data.stations);
      setLoading(false);
    })();
  }, []);

  const chargerTypes = ["All", "DC Fast", "AC Slow", "DC Ultra-Fast", "AC Level 2"];

  const filtered = stations.filter(s => {
    const q = search.toLowerCase();
    const matchSearch  = !q || s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q) || (s.facilities || []).some(f => f.toLowerCase().includes(q));
    const matchStatus  = filters.status === "All" || s.status === filters.status;
    const matchPrice   = (!filters.minPrice || s.price_per_kwh >= parseFloat(filters.minPrice)) && (!filters.maxPrice || s.price_per_kwh <= parseFloat(filters.maxPrice));
    const matchCharger = filters.chargerType === "All" || (s.chargers || []).some(c => c.type === filters.chargerType);
    return matchSearch && matchStatus && matchPrice && matchCharger;
  });

  const clearFilters = () => { setSearch(""); setFilters({ status: "All", minPrice: "", maxPrice: "", chargerType: "All" }); };
  const activeFilterCount = [filters.status !== "All", filters.minPrice !== "", filters.maxPrice !== "", filters.chargerType !== "All"].filter(Boolean).length;

  if (loading) return <Spinner text="Loading stations..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-white">Charging Stations</h2>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" />Online</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Offline</span>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="rounded-2xl border border-white/10 p-4" style={{ background: "rgba(15,25,45,0.8)" }}>
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-48 relative">
            <Icon name="stations" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, city, facility..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-white text-sm outline-none border transition-all"
              style={{ background: "rgba(255,255,255,0.05)", borderColor: search ? "rgba(0,196,255,0.4)" : "rgba(255,255,255,0.1)" }} />
          </div>
          <button onClick={() => setShowFilter(p => !p)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all"
            style={{ background: showFilter ? "rgba(0,196,255,0.1)" : "rgba(255,255,255,0.05)", borderColor: showFilter ? "rgba(0,196,255,0.4)" : "rgba(255,255,255,0.1)", color: showFilter ? "#00C4FF" : "#94a3b8" }}>
            <Icon name="analytics" className="w-4 h-4" />
            Filters {activeFilterCount > 0 && <span className="w-5 h-5 rounded-full bg-cyan-400 text-black text-xs font-black flex items-center justify-center">{activeFilterCount}</span>}
          </button>
          {(search || activeFilterCount > 0) && (
            <button onClick={clearFilters} className="px-3 py-2.5 rounded-xl text-xs text-red-400 border border-red-400/20 hover:bg-red-400/10 transition-all">Clear All</button>
          )}
        </div>

        {showFilter && (
          <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-slate-400 font-medium mb-1.5 block">Status</label>
              <select value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}
                className="w-full rounded-xl px-3 py-2 text-white text-sm outline-none border"
                style={{ background: "rgba(30,40,60,1)", borderColor: "rgba(255,255,255,0.1)" }}>
                <option>All</option><option>Online</option><option>Offline</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium mb-1.5 block">Charger Type</label>
              <select value={filters.chargerType} onChange={e => setFilters(p => ({ ...p, chargerType: e.target.value }))}
                className="w-full rounded-xl px-3 py-2 text-white text-sm outline-none border"
                style={{ background: "rgba(30,40,60,1)", borderColor: "rgba(255,255,255,0.1)" }}>
                {chargerTypes.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium mb-1.5 block">Min Price (₹/kWh)</label>
              <input type="number" value={filters.minPrice} onChange={e => setFilters(p => ({ ...p, minPrice: e.target.value }))}
                placeholder="e.g. 10" className="w-full rounded-xl px-3 py-2 text-white text-sm outline-none border"
                style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }} />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium mb-1.5 block">Max Price (₹/kWh)</label>
              <input type="number" value={filters.maxPrice} onChange={e => setFilters(p => ({ ...p, maxPrice: e.target.value }))}
                placeholder="e.g. 30" className="w-full rounded-xl px-3 py-2 text-white text-sm outline-none border"
                style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }} />
            </div>
          </div>
        )}
      </div>

      <p className="text-slate-400 text-sm">
        Showing <span className="text-white font-semibold">{filtered.length}</span> of {stations.length} stations
        {search && <span> for "<span className="text-cyan-400">{search}</span>"</span>}
      </p>

      <MapView stations={filtered} onSelectStation={onViewStation} />

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 p-12 text-center" style={{ background: "rgba(15,25,45,0.8)" }}>
          <Icon name="stations" className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No stations match your search.</p>
          <button onClick={clearFilters} className="text-cyan-400 text-sm mt-2 hover:text-cyan-300">Clear filters</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(s => {
            const avail = s.chargers?.filter(c => c.status === "Available").length || 0;
            const types = [...new Set((s.chargers || []).map(c => c.type))];
            return (
              <div key={s._id}
                style={{ cursor: "pointer", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(15,25,45,0.8)", padding: "20px", transition: "border-color 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(0,196,255,0.4)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"}>

                <div className="flex items-start justify-between mb-3">
                  <div onClick={() => onViewStation(s)} className="flex-1">
                    <h3 className="font-bold text-white">{s.name}</h3>
                    <p className="text-slate-400 text-xs mt-0.5">{s.address}</p>
                  </div>
                  <Badge color={s.status === "Online" ? "green" : "red"}>{s.status}</Badge>
                </div>

                {s.image && (
                  <img src={`http://localhost:5000/${s.image}`} alt={s.name} className="w-full h-28 object-cover rounded-xl mb-3"
                    onError={e => { e.target.style.display = "none"; }} />
                )}

                <div onClick={() => onViewStation(s)}>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-green-400 font-semibold">{avail} available of {s.chargers?.length}</span>
                    <span className="text-cyan-400 font-bold">₹{s.price_per_kwh}/kWh</span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap mb-2">
                    {types.map(t => (
                      <span key={t} className="text-xs px-2 py-0.5 rounded-md text-purple-400 border border-purple-400/20"
                        style={{ background: "rgba(167,139,250,0.08)" }}>{t}</span>
                    ))}
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {(s.facilities || []).slice(0, 4).map(f => (
                      <span key={f} className="text-xs px-2 py-0.5 rounded-md text-slate-400 border border-white/10">{f}</span>
                    ))}
                    {(s.facilities || []).length > 4 && (
                      <span className="text-xs px-2 py-0.5 rounded-md text-slate-500 border border-white/10">+{s.facilities.length - 4} more</span>
                    )}
                  </div>
                  {activeBooking && s.status === "Online" && (
                    <p className="text-xs text-yellow-400 mt-2">⚠ You have an active booking</p>
                  )}
                </div>

                {/* Bottom action row */}
                <div className="flex gap-2 mt-3">
                  <button onClick={() => onViewStation(s)}
                    className="flex-1 text-center py-2 rounded-xl text-xs font-bold text-cyan-400 border border-cyan-400/20 transition-all hover:bg-cyan-400/10"
                    style={{ background: "rgba(0,196,255,0.05)" }}>
                    View Station →
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); navigateToStation(s); }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                    style={{ background: "linear-gradient(135deg,#0066FF,#00C4FF)", color: "#fff", border: "none", cursor: "pointer", boxShadow: "0 0 10px rgba(0,102,255,0.25)" }}>
                    🗺️ Navigate
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FindStations;