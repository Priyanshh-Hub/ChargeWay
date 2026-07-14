import React, { useState, useEffect } from 'react';
import { api } from '../../api/api';
import { VEHICLE_NUMBER_REGEX } from '../../constants/validation';
import { CONNECTOR_TYPES } from '../../constants/carData';
import { Modal, InputField, Btn, Alert } from '../ui/index';

const EditVehicleModal = ({ vehicle, onClose, onSaved }) => {
  const [nickname, setNickname] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [connectorType, setConnectorType] = useState("CCS2");
  const [batteryHealth, setBatteryHealth] = useState(100);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (vehicle) {
      setNickname(vehicle.nickname || "");
      setVehicleNumber(vehicle.vehicleNumber || "");
      setConnectorType(vehicle.connectorType || "CCS2");
      setBatteryHealth(vehicle.batteryHealth ?? 100);
      setError("");
    }
  }, [vehicle]);

  const vnOk = VEHICLE_NUMBER_REGEX.test((vehicleNumber || "").replace(/\s/g, ""));

  const submit = async (e) => {
    e.preventDefault();
    if (!vnOk) { setError("Enter a valid vehicle number"); return; }
    setLoading(true); setError("");
    const res = await api.put(`/user/vehicles/${vehicle._id}`, {
      nickname: nickname.trim(), vehicleNumber, connectorType, batteryHealth: Number(batteryHealth),
    });
    setLoading(false);
    if (res.ok) { onSaved(res.data); }
    else setError(res.error || "Failed to update vehicle.");
  };

  return (
    <Modal open={!!vehicle} onClose={onClose} title={`Edit ${vehicle?.brand || ""} ${vehicle?.model || ""}`}>
      <form onSubmit={submit} className="space-y-4">
        <Alert message={error} />
        <InputField label="Nickname" value={nickname} onChange={e => setNickname(e.target.value)} placeholder="e.g. My daily driver" />
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Vehicle Number</label>
          <input type="text" value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value.toUpperCase())}
            className="w-full rounded-xl px-4 py-2.5 text-white text-center font-mono tracking-widest outline-none border"
            style={{ background: "rgba(255,255,255,0.05)", borderColor: vnOk ? "rgba(0,196,255,0.5)" : "rgba(255,255,255,0.1)" }} />
          {!vnOk && <p className="text-red-400 text-xs mt-1 text-center">Invalid format. Try MH12AB3456</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Connector Type</label>
          <select value={connectorType} onChange={e => setConnectorType(e.target.value)}
            className="w-full rounded-xl px-4 py-2.5 text-white text-sm outline-none border"
            style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }}>
            {CONNECTOR_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-slate-300">Battery Health</label>
            <span className="text-sm font-bold text-cyan-400">{batteryHealth}%</span>
          </div>
          <input type="range" min="1" max="100" value={batteryHealth} onChange={e => setBatteryHealth(e.target.value)} className="w-full accent-cyan-400" />
        </div>
        <Btn type="submit" loading={loading} className="w-full">Save Changes</Btn>
      </form>
    </Modal>
  );
};

export default EditVehicleModal;
