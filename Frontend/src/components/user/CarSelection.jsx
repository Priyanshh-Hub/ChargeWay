import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../api/api';
import { CAR_BRANDS, CAR_MODELS } from '../../constants/carData';
import { VEHICLE_NUMBER_REGEX } from '../../constants/validation';
import { GlassCard, Btn, Alert, Badge } from '../ui/index';
import Icon from '../ui/Icon';
import VehicleVisual from '../vehicle/VehicleVisual';

const CarSelection = ({ user, onCarSaved, onLogout }) => {
  const [step,          setStep]          = useState(1);
  const [brand,         setBrand]         = useState(null);
  const [brandSearch,   setBrandSearch]   = useState("");
  const [modelSearch,   setModelSearch]   = useState("");
  const [selectedCar,   setSelectedCar]   = useState(null);
  const [vehicleNumber, setVehicleNumber] = useState("");
  // Battery HEALTH (pack condition) — a real, user-declared attribute a
  // buyer generally knows roughly, unlike a live "current charge %" which
  // ChargeWay has no way to read. A plain dropdown with condition labels,
  // not a raw 0–100 slider or number field, so this never reads like a
  // precise live sensor value — just the rider's own honest estimate.
  const [batteryHealth, setBatteryHealth] = useState(100);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");

  const HEALTH_OPTIONS = [
    { v: 100, l: "Excellent — brand new or like new" },
    { v: 90,  l: "Good — normal wear, no issues" },
    { v: 75,  l: "Fair — noticeably reduced range" },
    { v: 60,  l: "Worn — significant capacity loss" },
  ];

  const filteredBrands = useMemo(() =>
    CAR_BRANDS.filter(b => b.name.toLowerCase().includes(brandSearch.trim().toLowerCase())),
    [brandSearch]
  );

  const filtered = useMemo(() =>
    CAR_MODELS.filter(c => c.brand === brand && c.model.toLowerCase().includes(modelSearch.trim().toLowerCase())),
    [brand, modelSearch]
  );

  const vnOk = VEHICLE_NUMBER_REGEX.test(vehicleNumber.replace(/\s/g, ""));

  const handleConfirm = async () => {
    if (!selectedCar || !vnOk) return;
    setLoading(true); setError("");
    // batteryHealth is a real, user-declared attribute (pack condition),
    // picked explicitly below — not a live reading, and never a raw
    // "current charge %" (ChargeWay has no telemetry connection to any
    // vehicle, so that number would just be made up).
    const carData = { ...selectedCar, vehicleNumber, batteryHealth };
    const res = await api.post("/user/vehicles", carData);
    if (res.ok) onCarSaved(res.data.user);
    else setError(res.error || "Failed to save car.");
    setLoading(false);
  };

  return (
    <div className="min-h-screen pt-20 pb-12 px-6 text-white">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-end mb-2">
          {onLogout && (
            <button onClick={onLogout} className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1.5">
              <Icon name="logout" className="w-3.5 h-3.5" /> Sign out
            </button>
          )}
        </div>
        <div className="text-center mb-10">
          <h1 className="text-hero" style={{ background: "linear-gradient(90deg,#FF8A3D,#7C6AE8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Let's Connect Your EV
          </h1>
          <p className="text-slate-400 mt-2">{step === 1 ? "Step 1: Select your brand" : `Step 2: Choose ${brand} model`}</p>
        </div>

        {step === 1 ? (
          <>
            <div className="relative max-w-md mx-auto mb-6">
              <Icon name="search" className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input value={brandSearch} onChange={e => setBrandSearch(e.target.value)} placeholder="Search brand (e.g. Tata, Tesla)"
                className="w-full rounded-xl pl-10 pr-4 py-2.5 text-white text-sm outline-none border"
                style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }} />
            </div>
            {filteredBrands.length === 0 ? (
              <p className="text-center text-slate-500 text-sm">No brands match "{brandSearch}"</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {filteredBrands.map(b => (
                  <motion.div key={b.name} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                    onClick={() => { setBrand(b.name); setStep(2); setModelSearch(""); }}
                    className="cursor-pointer rounded-2xl p-6 border border-white/10 flex flex-col items-center justify-center gap-3 h-28 hover:border-[#FF8A3D]/50 transition-all"
                    style={{ background: "rgba(15,25,45,0.8)" }}>
                    <img src={b.logo} alt={b.name} className="h-9 w-auto object-contain" onError={e => { e.target.style.display = "none"; }} />
                    <p className="text-sm font-semibold text-slate-300">{b.name}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <button onClick={() => { setStep(1); setSelectedCar(null); }} className="text-[#FF8A3D] text-sm mb-4 hover:text-[#FFAB70]">← Back to Brands</button>
            <div className="relative max-w-md mb-6">
              <Icon name="search" className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input value={modelSearch} onChange={e => setModelSearch(e.target.value)} placeholder={`Search ${brand} models`}
                className="w-full rounded-xl pl-10 pr-4 py-2.5 text-white text-sm outline-none border"
                style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }} />
            </div>
            {filtered.length === 0 ? (
              <p className="text-slate-500 text-sm mb-8">No {brand} models match "{modelSearch}"</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
                {filtered.map(car => (
                  <motion.div key={car.model} whileHover={{ scale: 1.02 }} onClick={() => setSelectedCar(car)}
                    className={`cursor-pointer rounded-2xl p-5 border transition-all ${selectedCar?.model === car.model ? "border-[#FF8A3D] shadow-[0_0_30px_rgba(255,138,61,0.15)]" : "border-white/10 hover:border-white/20"}`}
                    style={{ background: "rgba(15,25,45,0.8)" }}>
                    <div className="rounded-xl h-40 overflow-hidden mb-4 bg-slate-900/60 relative">
                      <VehicleVisual color={car.color} connectorType={car.connectorType} size="md" />
                      <div className="absolute top-2 right-2"><Badge color="blue"><Icon name="plug" className="w-3 h-3 inline mr-0.5" />{car.connectorType}</Badge></div>
                    </div>
                    <h3 className="font-bold text-white">{car.brand} {car.model}</h3>
                    <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                      {[{ v: `${car.battery_kwh} kWh`, l: "Battery" }, { v: `${car.range_km} km`, l: "Range" }, { v: car.color, l: "Color" }].map(item => (
                        <div key={item.l} className="p-1.5 rounded-lg" style={{ background: "rgba(255,138,61,0.05)" }}>
                          <p className="text-xs font-bold text-[#FF8A3D] cw-figure">{item.v}</p>
                          <p className="text-xs text-slate-500">{item.l}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
            {selectedCar && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <GlassCard className="p-6 max-w-md mx-auto">
                  <h3 className="font-bold text-lg text-center mb-1">Enter Vehicle Number</h3>
                  <p className="text-center text-xs text-slate-500 mb-3">Connector type: <span className="text-[#FF8A3D] font-semibold">{selectedCar.connectorType}</span> — matched against station chargers when you book</p>
                  <Alert type="error" message={error} />
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Battery Health (your best estimate — not a live reading)</label>
                    <select value={batteryHealth} onChange={e => setBatteryHealth(Number(e.target.value))}
                      className="w-full rounded-xl px-4 py-2.5 text-white text-sm outline-none border"
                      style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }}>
                      {HEALTH_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                    </select>
                  </div>
                  <input type="text" value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. MH12AB3456"
                    className="w-full mt-3 rounded-xl px-4 py-3 text-white text-center text-xl font-mono tracking-widest outline-none border"
                    style={{ background: "rgba(255,255,255,0.05)", borderColor: vnOk ? "rgba(255,138,61,0.5)" : "rgba(255,255,255,0.1)" }} />
                  {vehicleNumber && !vnOk && <p className="text-red-400 text-xs mt-1 text-center">Invalid format. Try MH12AB3456</p>}
                  <Btn disabled={!vnOk} loading={loading} onClick={handleConfirm} className="w-full mt-4">Save Vehicle</Btn>
                </GlassCard>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CarSelection;
