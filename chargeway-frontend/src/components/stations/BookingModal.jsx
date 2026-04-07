import React from 'react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../api/api';
import { VEHICLE_NUMBER_REGEX } from '../../constants/validation';
import { GlassCard, Btn, Alert } from '../ui/index';
import Icon from '../ui/Icon';

const BookingModal = ({ station, charger, car, user, onClose, onConfirmBooking }) => {
  const [step,          setStep]          = useState(1);
  const [timeSlot,      setTimeSlot]      = useState(null);
  const [mode,          setMode]          = useState("percent");
  const [currentPct,    setCurrentPct]    = useState("");
  const [targetPct,     setTargetPct]     = useState(80);
  const [targetMoney,   setTargetMoney]   = useState(200);
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [vehicleNumber, setVehicleNumber] = useState(car?.vehicleNumber || "");
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");
  const [confirmed,     setConfirmed]     = useState(null);

  const batCapacity = car?.battery_kwh || 40;
  const carRange    = car?.range_km    || 300;
  const carEffic    = car?.efficiency  || 7.5;
  const curPct      = Math.min(99, Math.max(0, parseInt(currentPct) || 0));

  // Max energy the battery can still accept from current charge level
  const maxEnergyCanFit = batCapacity * ((100 - curPct) / 100);

  // FIX 3: In money mode, cap energy so it never exceeds battery capacity
  const rawEnergy = mode === "percent"
    ? Math.max(0, batCapacity * ((targetPct - curPct) / 100))
    : targetMoney / station.price_per_kwh;

  const energyNeeded = parseFloat(Math.min(rawEnergy, maxEnergyCanFit).toFixed(2));

  const dur        = Math.ceil((energyNeeded / (charger?.power || 50)) * 60);
  const chargeCost = (energyNeeded * station.price_per_kwh).toFixed(2);
  const total      = (energyNeeded * station.price_per_kwh + 20).toFixed(2);

  // FIX 3: rangeAdded = kWh × efficiency(km/kWh) — correct
  const rangeAdded = Math.round(energyNeeded * carEffic);

  const finalPct = mode === "percent"
    ? targetPct
    : Math.min(100, Math.round(curPct + (energyNeeded / batCapacity * 100)));

  // FIX 2: Dynamic max budget = cost to fully charge from current %
  const maxBudget = Math.ceil((maxEnergyCanFit * station.price_per_kwh) / 50) * 50;

  const slots = ["09:00 AM","09:30 AM","10:00 AM","10:30 AM","04:00 PM","04:30 PM","05:00 PM","05:30 PM","06:00 PM","06:30 PM","07:00 PM","07:30 PM"];
  const paymentMethods = [
    { id: "UPI",         icon: "📱", label: "UPI",         active: true  },
    { id: "Credit Card", icon: "💳", label: "Credit Card", active: false },
    { id: "Debit Card",  icon: "🏧", label: "Debit Card",  active: false },
    { id: "Net Banking", icon: "🏦", label: "Net Banking", active: false },
  ];

  const vnOk    = VEHICLE_NUMBER_REGEX.test(vehicleNumber.replace(/\s/g, ""));
  const canBook = currentPct !== "" && (mode === "percent" ? targetPct > curPct : targetMoney > 0) && timeSlot && vnOk && energyNeeded > 0;

  const handleConfirm = async () => {
    if (!canBook) return;
    setLoading(true); setError("");
    const res = await api.post("/bookings", {
      stationId: station._id, stationName: station.name, chargerId: charger.id,
      vehicleNumber: vehicleNumber.toUpperCase(), timeSlot,
      date: new Date().toISOString().split("T")[0],
      duration: dur, energyKwh: energyNeeded,
      costPerKwh: station.price_per_kwh, platformFee: 20,
      totalCost: parseFloat(total), paymentMethod,
      currentBattery: curPct, targetBattery: finalPct,
    });
    if (res.ok) { setConfirmed(res.data.booking); await onConfirmBooking(res.data.booking); setStep(2); }
    else setError(res.error || "Booking failed. Try again.");
    setLoading(false);
  };

  // ── Confirmation Screen ──
  if (step === 2 && confirmed) return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <GlassCard className="p-8 max-w-sm w-full text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.1 }}
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: "linear-gradient(135deg,#10b981,#06b6d4)" }}>
          <Icon name="check" className="w-8 h-8 text-white" />
        </motion.div>
        <h2 className="text-2xl font-black text-white mb-1">Booking Confirmed!</h2>
        <p className="text-slate-400 text-sm mb-5">Your charging slot is reserved</p>
        <div className="p-4 rounded-xl text-sm text-left space-y-2 mb-4" style={{ background: "rgba(0,196,255,0.05)", border: "1px solid rgba(0,196,255,0.1)" }}>
          {[
            { l: "Booking ID", v: confirmed._id,                      mono: true  },
            { l: "Station",    v: station.name,                       mono: false },
            { l: "Charger",    v: `#${charger.id} · ${charger.type}`, mono: false },
            { l: "Vehicle",    v: vehicleNumber.toUpperCase(),         mono: true  },
            { l: "Time Slot",  v: timeSlot,                           mono: false },
            { l: "Duration",   v: `~${dur} minutes`,                  mono: false },
            { l: "Energy",     v: `${energyNeeded} kWh`,              mono: false },
            { l: "Range Added",v: `+${rangeAdded} km`,                mono: false },
            { l: "Payment",    v: paymentMethod,                      mono: false },
          ].map(item => (
            <div key={item.l} className="flex justify-between gap-2">
              <span className="text-slate-400 flex-shrink-0">{item.l}</span>
              <span className={`text-right ${item.mono ? "font-mono text-xs text-slate-300" : "text-white font-medium"}`}>{item.v}</span>
            </div>
          ))}
          <div className="flex justify-between pt-2 border-t border-white/10">
            <span className="font-bold text-white">Total Paid</span>
            <span className="text-cyan-400 font-black text-lg">₹{total}</span>
          </div>
        </div>
        <div className="p-3 rounded-xl mb-5" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
          <div className="flex justify-between text-xs text-slate-400 mb-1.5">
            <span>Battery: {curPct}% → {finalPct}%</span>
            <span className="text-green-400">+{rangeAdded} km range</span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
            <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg,#10b981,#06b6d4)" }}
              initial={{ width: `${curPct}%` }} animate={{ width: `${finalPct}%` }} transition={{ duration: 1.2, delay: 0.3 }} />
          </div>
        </div>
        <Btn onClick={onClose} className="w-full">Done</Btn>
      </GlassCard>
    </motion.div>
  );

  // ── Booking Form ──
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        onClick={e => e.stopPropagation()} className="w-full max-w-3xl max-h-[92vh] overflow-y-auto">
        <GlassCard className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black text-white">Book Charger #{charger.id}</h2>
              <p className="text-slate-400 text-sm">{station.name} · {charger.type} · {charger.power}kW</p>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 border border-white/10 transition-all">
              <Icon name="x" className="w-5 h-5" />
            </button>
          </div>

          {error && <div className="mb-4"><Alert message={error} /></div>}

          <div className="grid md:grid-cols-2 gap-8">
            {/* ── LEFT ── */}
            <div className="space-y-5">

              {/* Vehicle info */}
              {car && (
                <div className="p-4 rounded-2xl border border-white/10" style={{ background: "rgba(0,196,255,0.04)" }}>
                  <p className="text-xs font-semibold text-cyan-400 mb-2 uppercase tracking-wider">Your Vehicle Info</p>
                  <p className="text-white font-bold text-sm mb-3">{car.brand} {car.model}</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      { l: "Capacity", v: `${batCapacity} kWh`, c: "#00C4FF" },
                      { l: "Max Range", v: `${carRange} km`,    c: "#10b981" },
                      { l: "Charger",  v: charger.type,         c: "#a78bfa" },
                    ].map(i => (
                      <div key={i.l} className="p-2 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <p className="font-bold text-xs" style={{ color: i.c }}>{i.v}</p>
                        <p className="text-slate-500 text-xs">{i.l}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vehicle number */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Vehicle Number <span className="text-red-400">*</span></label>
                <input type="text" value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. GJ01AB1234" maxLength={12}
                  className="w-full rounded-xl px-4 py-2.5 text-white text-center font-mono text-lg tracking-widest outline-none border transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", borderColor: vehicleNumber && !vnOk ? "rgba(248,113,113,0.5)" : vehicleNumber && vnOk ? "rgba(16,185,129,0.5)" : "rgba(255,255,255,0.1)" }} />
                {vehicleNumber && !vnOk && <p className="text-red-400 text-xs mt-1">Invalid format. Try GJ01AB1234</p>}
                {vehicleNumber && vnOk  && <p className="text-green-400 text-xs mt-1">✓ Valid vehicle number</p>}
              </div>

              {/* Current battery */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Current Battery % <span className="text-red-400">*</span></label>
                <div className="relative">
                  <input type="number" min="0" max="99" value={currentPct}
                    onChange={e => {
                      const raw = e.target.value;
                      if (raw === "") { setCurrentPct(""); return; }
                      const v = Math.min(99, Math.max(0, parseInt(raw) || 0));
                      setCurrentPct(String(v));
                      if (v >= targetPct) setTargetPct(Math.min(100, v + 10));
                    }}
                    placeholder="Enter your current battery %"
                    className="w-full rounded-xl px-4 pr-12 py-2.5 text-white text-sm outline-none border transition-all"
                    style={{ background: "rgba(255,255,255,0.05)", borderColor: currentPct === "" ? "rgba(255,255,255,0.1)" : "rgba(0,196,255,0.4)" }} />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                </div>
                {currentPct !== "" && (
                  <div className="mt-2">
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${curPct}%`, background: curPct < 20 ? "linear-gradient(90deg,#ef4444,#f97316)" : curPct < 50 ? "linear-gradient(90deg,#f97316,#fbbf24)" : "linear-gradient(90deg,#10b981,#06b6d4)" }} />
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>Current: {curPct}%</span>
                      {/* FIX 3: Show actual kWh in battery right now */}
                      <span>{(batCapacity * curPct / 100).toFixed(1)} / {batCapacity} kWh</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Charging Goal */}
              <div>
                <p className="text-sm font-medium text-slate-300 mb-2">Charging Goal</p>
                <div className="flex rounded-xl p-1 mb-3" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  {[{ id: "percent", label: "By % Target" }, { id: "money", label: "By ₹ Budget" }].map(o => (
                    <button key={o.id} onClick={() => setMode(o.id)} className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                      style={{ background: mode === o.id ? "linear-gradient(135deg,#0066FF,#00C4FF)" : "transparent", color: mode === o.id ? "white" : "#64748b" }}>
                      {o.label}
                    </button>
                  ))}
                </div>

                {mode === "percent" ? (
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-400">From <span className="text-white font-bold">{curPct}%</span></span>
                      <span className="text-cyan-400 font-bold">To {targetPct}%</span>
                    </div>
                    <input type="range" min={curPct + 1} max={100} value={targetPct}
                      onChange={e => setTargetPct(parseInt(e.target.value))}
                      className="w-full accent-cyan-400" disabled={currentPct === ""} />
                    {currentPct !== "" && energyNeeded > 0 && (
                      <div className="mt-2 p-2.5 rounded-xl text-xs space-y-1" style={{ background: "rgba(0,196,255,0.05)", border: "1px solid rgba(0,196,255,0.08)" }}>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Energy needed</span>
                          {/* FIX 3: Correct kWh shown */}
                          <span className="text-cyan-400 font-bold">{energyNeeded} kWh</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Range added</span>
                          <span className="text-green-400 font-bold">+{rangeAdded} km</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Battery after</span>
                          <span className="text-white font-bold">{targetPct}% ({(batCapacity * targetPct / 100).toFixed(1)} kWh)</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-400">Budget</span>
                      <span className="text-cyan-400 font-bold">₹{targetMoney}</span>
                    </div>
                    {/* FIX 2: Dynamic max = cost to fully charge from current % */}
                    <input type="range" min={50} max={maxBudget} step={50} value={Math.min(targetMoney, maxBudget)}
                      onChange={e => setTargetMoney(parseInt(e.target.value))}
                      className="w-full accent-cyan-400" />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>₹50</span>
                      <span>Max ₹{maxBudget} = full charge</span>
                    </div>
                    {currentPct !== "" && energyNeeded > 0 && (
                      <div className="mt-2 p-2.5 rounded-xl text-xs space-y-1" style={{ background: "rgba(0,196,255,0.05)", border: "1px solid rgba(0,196,255,0.08)" }}>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Energy you get</span>
                          {/* FIX 3: Capped kWh shown */}
                          <span className="text-cyan-400 font-bold">{energyNeeded} kWh</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Battery after</span>
                          <span className="text-white font-bold">{finalPct}% ({(batCapacity * finalPct / 100).toFixed(1)} kWh)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Range added</span>
                          <span className="text-green-400 font-bold">+{rangeAdded} km</span>
                        </div>
                        {/* Show notice if budget exceeds what battery can hold */}
                        {targetMoney > maxBudget && (
                          <p className="text-yellow-400 pt-1">⚠️ Budget capped — battery will be full at {finalPct}%</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Time Slot */}
              <div>
                <p className="text-sm font-medium text-slate-300 mb-2">Time Slot</p>
                <div className="grid grid-cols-3 gap-2">
                  {slots.map(s => (
                    <button key={s} onClick={() => setTimeSlot(s)} className="py-2 px-1 rounded-xl text-xs font-medium transition-all border"
                      style={{ borderColor: timeSlot === s ? "rgba(0,196,255,0.5)" : "rgba(255,255,255,0.08)", background: timeSlot === s ? "rgba(0,196,255,0.1)" : "rgba(255,255,255,0.02)", color: timeSlot === s ? "#00C4FF" : "#64748b" }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── RIGHT ── */}
            <div className="space-y-4">

              {/* Order summary */}
              <div className="p-5 rounded-2xl" style={{ background: "rgba(0,196,255,0.03)", border: "1px solid rgba(0,196,255,0.1)" }}>
                <p className="text-sm font-semibold text-slate-300 mb-4">Order Summary</p>
                <div className="space-y-2.5 text-sm">
                  {[
                    { l: "Energy Needed",  v: `${energyNeeded} kWh`            },
                    { l: "Estimated Time", v: `~${dur} min`                     },
                    { l: "Rate",           v: `₹${station.price_per_kwh}/kWh`  },
                    { l: "Charging Cost",  v: `₹${chargeCost}`                 },
                    { l: "Platform Fee",   v: "₹20"                            },
                  ].map(i => (
                    <div key={i.l} className="flex justify-between">
                      <span className="text-slate-400">{i.l}</span>
                      <span className="text-white">{i.v}</span>
                    </div>
                  ))}
                  <div className="border-t border-white/10 pt-2.5 flex justify-between text-lg font-black">
                    <span className="text-white">Total</span>
                    <span className="text-cyan-400">₹{total}</span>
                  </div>
                </div>
              </div>

              {/* Battery preview */}
              {currentPct !== "" && energyNeeded > 0 && (
                <div className="p-4 rounded-2xl" style={{ background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.15)" }}>
                  <p className="text-xs font-semibold text-green-400 mb-3 uppercase tracking-wider">Battery Preview</p>
                  <div className="flex justify-between text-xs text-slate-400 mb-2">
                    <span>{curPct}% → {finalPct}%</span>
                    <span className="text-green-400">+{rangeAdded} km range</span>
                  </div>
                  <div className="h-4 rounded-full overflow-hidden relative" style={{ background: "rgba(255,255,255,0.06)" }}>
                    {/* Current level dim */}
                    <div className="absolute h-full rounded-full opacity-30"
                      style={{ width: `${curPct}%`, background: "linear-gradient(90deg,#10b981,#06b6d4)" }} />
                    {/* After charging animated */}
                    <motion.div className="h-full rounded-full"
                      style={{ background: "linear-gradient(90deg,#10b981,#06b6d4)" }}
                      initial={{ width: `${curPct}%` }}
                      animate={{ width: `${finalPct}%` }}
                      transition={{ duration: 1, delay: 0.2 }} />
                  </div>
                  <div className="flex justify-between text-xs mt-1.5">
                    <span className="text-slate-500">{(batCapacity * curPct / 100).toFixed(1)} kWh now</span>
                    <span className="text-green-400 font-semibold">{(batCapacity * finalPct / 100).toFixed(1)} kWh after</span>
                  </div>
                </div>
              )}

              {/* Payment */}
              <div>
                <p className="text-sm font-medium text-slate-300 mb-2">Payment Method</p>
                <div className="space-y-2">
                  {paymentMethods.map(pm => (
                    <div key={pm.id} onClick={() => pm.active && setPaymentMethod(pm.id)}
                      className="flex items-center gap-3 p-3 rounded-xl border transition-all"
                      style={{ cursor: pm.active ? "pointer" : "not-allowed", opacity: pm.active ? 1 : 0.4, borderColor: paymentMethod === pm.id && pm.active ? "rgba(0,196,255,0.5)" : "rgba(255,255,255,0.08)", background: paymentMethod === pm.id && pm.active ? "rgba(0,196,255,0.08)" : "rgba(255,255,255,0.02)" }}>
                      <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                        style={{ borderColor: paymentMethod === pm.id && pm.active ? "#00C4FF" : "rgba(255,255,255,0.2)" }}>
                        {paymentMethod === pm.id && pm.active && <div className="w-2 h-2 rounded-full bg-cyan-400" />}
                      </div>
                      <span className="text-base">{pm.icon}</span>
                      <div className="flex-1">
                        <p className={`text-sm font-semibold ${pm.active ? "text-white" : "text-slate-500"}`}>{pm.label}</p>
                        {!pm.active && <p className="text-xs text-slate-600">Coming Soon</p>}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pm.active ? "text-green-400 bg-green-400/10" : "text-slate-600 bg-white/5"}`}>
                        {pm.active ? "Available" : "Soon"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hints */}
              {currentPct === "" && (
                <div className="p-3 rounded-xl text-xs text-yellow-400" style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)" }}>
                  ⚡ Enter your current battery % to calculate energy needed
                </div>
              )}
              {currentPct !== "" && mode === "percent" && targetPct <= curPct && (
                <div className="p-3 rounded-xl text-xs text-red-400" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                  ❌ Target must be higher than current {curPct}%
                </div>
              )}
              {!timeSlot && currentPct !== "" && (
                <div className="p-3 rounded-xl text-xs text-slate-400" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  📅 Please select a time slot
                </div>
              )}

              <Btn onClick={handleConfirm} disabled={!canBook} loading={loading} className="w-full text-base py-3">
                {canBook ? `Confirm & Pay ₹${total}` : "Fill all fields above"}
              </Btn>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
};

export default BookingModal;