import React from 'react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../api/api';
import { CAR_BRANDS, CAR_MODELS } from '../../constants/carData';
import { VEHICLE_NUMBER_REGEX } from '../../constants/validation';
import { GlassCard, Btn, Alert } from '../ui/index';

const CarSelection = ({ user, onCarSaved, onLogout }) => {
  const [step,          setStep]          = useState(1);
  const [brand,         setBrand]         = useState(null);
  const [selectedCar,   setSelectedCar]   = useState(null);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");

  const filtered = CAR_MODELS.filter(c => c.brand === brand);
  const vnOk     = VEHICLE_NUMBER_REGEX.test(vehicleNumber.replace(/\s/g, ""));

  const handleConfirm = async () => {
    if (!selectedCar || !vnOk) return;
    setLoading(true); setError("");
    const carData = { ...selectedCar, vehicleNumber, battery: 85 };
    const res = await api.put("/user/car", carData);
    if (res.ok) onCarSaved(res.data.user);
    else setError(res.error || "Failed to save car.");
    setLoading(false);
  };

  return (
    <div className="min-h-screen pt-20 pb-12 px-6 text-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black" style={{ background: "linear-gradient(90deg,#00C4FF,#60A5FA)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Vehicle Setup
          </h1>
          <p className="text-slate-400 mt-2">{step === 1 ? "Step 1: Select your brand" : `Step 2: Choose ${brand} model`}</p>
        </div>

        {step === 1 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {CAR_BRANDS.map(b => (
              <motion.div key={b.name} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                onClick={() => { setBrand(b.name); setStep(2); }}
                className="cursor-pointer rounded-2xl p-6 border border-white/10 flex flex-col items-center justify-center gap-3 h-28 hover:border-cyan-400/50 transition-all"
                style={{ background: "rgba(15,25,45,0.8)" }}>
                <img src={b.logo} alt={b.name} className="h-9 w-auto object-contain" onError={e => { e.target.style.display = "none"; }} />
                <p className="text-sm font-semibold text-slate-300">{b.name}</p>
              </motion.div>
            ))}
          </div>
        ) : (
          <>
            <button onClick={() => { setStep(1); setSelectedCar(null); }} className="text-cyan-400 text-sm mb-6 hover:text-cyan-300">← Back to Brands</button>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
              {filtered.map(car => (
                <motion.div key={car.model} whileHover={{ scale: 1.02 }} onClick={() => setSelectedCar(car)}
                  className={`cursor-pointer rounded-2xl p-5 border transition-all ${selectedCar?.model === car.model ? "border-cyan-400 shadow-[0_0_30px_rgba(0,196,255,0.15)]" : "border-white/10 hover:border-white/20"}`}
                  style={{ background: "rgba(15,25,45,0.8)" }}>
                  <div className="rounded-xl h-40 overflow-hidden mb-4 bg-slate-800/50">
                    <img src={car.image} alt={car.model} className="w-full h-full object-cover"
                      onError={e => { e.target.src = `https://placehold.co/320x160/0A1628/00C4FF?text=${encodeURIComponent(car.brand + ' ' + car.model)}`; }} />
                  </div>
                  <h3 className="font-bold text-white">{car.brand} {car.model}</h3>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                    {[{ v: `${car.battery_kwh} kWh`, l: "Battery" }, { v: `${car.range_km} km`, l: "Range" }, { v: car.color, l: "Color" }].map(item => (
                      <div key={item.l} className="p-1.5 rounded-lg" style={{ background: "rgba(0,196,255,0.05)" }}>
                        <p className="text-xs font-bold text-cyan-400">{item.v}</p>
                        <p className="text-xs text-slate-500">{item.l}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
            {selectedCar && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <GlassCard className="p-6 max-w-md mx-auto">
                  <h3 className="font-bold text-lg text-center mb-4">Enter Vehicle Number</h3>
                  <Alert type="error" message={error} />
                  <input type="text" value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. MH12AB3456"
                    className="w-full mt-3 rounded-xl px-4 py-3 text-white text-center text-xl font-mono tracking-widest outline-none border"
                    style={{ background: "rgba(255,255,255,0.05)", borderColor: vnOk ? "rgba(0,196,255,0.5)" : "rgba(255,255,255,0.1)" }} />
                  {vehicleNumber && !vnOk && <p className="text-red-400 text-xs mt-1 text-center">Invalid format. Try MH12AB3456</p>}
                  <Btn disabled={!vnOk} loading={loading} onClick={handleConfirm} className="w-full mt-4">Confirm Selection</Btn>
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
