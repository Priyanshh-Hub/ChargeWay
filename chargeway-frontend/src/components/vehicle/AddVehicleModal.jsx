import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../api/api';
import { CAR_BRANDS, CAR_MODELS } from '../../constants/carData';
import { VEHICLE_NUMBER_REGEX } from '../../constants/validation';
import { Modal, InputField, Btn, Alert, Badge } from '../ui/index';
import Icon from '../ui/Icon';
import VehicleVisual from './VehicleVisual';

const AddVehicleModal = ({ open, onClose, onAdded }) => {
  const [phase, setPhase] = useState("brand"); // brand | model | details
  const [brandSearch, setBrandSearch] = useState("");
  const [modelSearch, setModelSearch] = useState("");
  const [brand, setBrand] = useState(null);
  const [selectedCar, setSelectedCar] = useState(null);
  const [nickname, setNickname] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => { setPhase("brand"); setBrand(null); setSelectedCar(null); setNickname(""); setVehicleNumber(""); setError(""); setBrandSearch(""); setModelSearch(""); };
  const handleClose = () => { reset(); onClose(); };

  const filteredBrands = useMemo(() => CAR_BRANDS.filter(b => b.name.toLowerCase().includes(brandSearch.trim().toLowerCase())), [brandSearch]);
  const filteredModels = useMemo(() => CAR_MODELS.filter(c => c.brand === brand && c.model.toLowerCase().includes(modelSearch.trim().toLowerCase())), [brand, modelSearch]);
  const vnOk = VEHICLE_NUMBER_REGEX.test(vehicleNumber.replace(/\s/g, ""));

  const submit = async () => {
    if (!selectedCar || !vnOk) return;
    setLoading(true); setError("");
    const res = await api.post("/user/vehicles", { ...selectedCar, nickname: nickname.trim(), vehicleNumber, battery: 85, batteryHealth: 100 });
    setLoading(false);
    if (res.ok) { onAdded(res.data); handleClose(); }
    else setError(res.error || "Failed to add vehicle.");
  };

  return (
    <Modal open={open} onClose={handleClose} title="Add a Vehicle" maxWidth="max-w-2xl">
      {phase === "brand" && (
        <div>
          <div className="relative mb-4">
            <Icon name="search" className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input value={brandSearch} onChange={e => setBrandSearch(e.target.value)} placeholder="Search brand"
              className="w-full rounded-xl pl-10 pr-4 py-2.5 text-white text-sm outline-none border"
              style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }} />
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-80 overflow-y-auto pr-1">
            {filteredBrands.map(b => (
              <motion.button key={b.name} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => { setBrand(b.name); setPhase("model"); }}
                className="cursor-pointer rounded-xl p-4 border border-white/10 flex flex-col items-center justify-center gap-2 h-24 hover:border-cyan-400/50 transition-all"
                style={{ background: "rgba(15,25,45,0.8)" }}>
                <img src={b.logo} alt={b.name} className="h-7 w-auto object-contain" onError={e => { e.target.style.display = "none"; }} />
                <p className="text-xs font-semibold text-slate-300">{b.name}</p>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {phase === "model" && (
        <div>
          <button onClick={() => setPhase("brand")} className="text-cyan-400 text-sm mb-3 hover:text-cyan-300">← Back to Brands</button>
          <div className="relative mb-4">
            <Icon name="search" className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input value={modelSearch} onChange={e => setModelSearch(e.target.value)} placeholder={`Search ${brand} models`}
              className="w-full rounded-xl pl-10 pr-4 py-2.5 text-white text-sm outline-none border"
              style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
            {filteredModels.map(car => (
              <button key={car.model} onClick={() => { setSelectedCar(car); setPhase("details"); }}
                className="text-left rounded-xl p-3 border border-white/10 hover:border-cyan-400/50 transition-all flex gap-3"
                style={{ background: "rgba(15,25,45,0.8)" }}>
                <div className="w-20 h-16 rounded-lg flex-shrink-0 overflow-hidden bg-slate-900/60">
                  <VehicleVisual color={car.color} connectorType={car.connectorType} size="sm" />
                </div>
                <div>
                  <p className="font-bold text-white text-sm">{car.model}</p>
                  <p className="text-xs text-slate-500">{car.range_km} km · {car.battery_kwh} kWh</p>
                  <Badge color="purple">{car.connectorType}</Badge>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === "details" && selectedCar && (
        <div className="space-y-4">
          <button onClick={() => setPhase("model")} className="text-cyan-400 text-sm hover:text-cyan-300">← Back to Models</button>
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(0,196,255,0.05)" }}>
            <div className="w-16 h-12 rounded-lg overflow-hidden bg-slate-900/60 flex-shrink-0">
              <VehicleVisual color={selectedCar.color} connectorType={selectedCar.connectorType} size="sm" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">{selectedCar.brand} {selectedCar.model}</p>
              <p className="text-xs text-slate-500">Connector: <span className="text-cyan-400">{selectedCar.connectorType}</span></p>
            </div>
          </div>
          <Alert message={error} />
          <InputField label="Nickname (optional)" value={nickname} onChange={e => setNickname(e.target.value)} placeholder="e.g. My daily driver" />
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Vehicle Number <span className="text-red-400">*</span></label>
            <input type="text" value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value.toUpperCase())}
              placeholder="e.g. MH12AB3456"
              className="w-full rounded-xl px-4 py-2.5 text-white text-center text-lg font-mono tracking-widest outline-none border"
              style={{ background: "rgba(255,255,255,0.05)", borderColor: vnOk ? "rgba(0,196,255,0.5)" : "rgba(255,255,255,0.1)" }} />
            {vehicleNumber && !vnOk && <p className="text-red-400 text-xs mt-1 text-center">Invalid format. Try MH12AB3456</p>}
          </div>
          <Btn onClick={submit} disabled={!vnOk} loading={loading} className="w-full">Add Vehicle</Btn>
        </div>
      )}
    </Modal>
  );
};

export default AddVehicleModal;
