import React from 'react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../api/api';
import { VEHICLE_NUMBER_REGEX } from '../../constants/validation';
import { getPricingContext, isDiscountEligible } from '../../utils/pricing';
import { GlassCard, Btn, Alert } from '../ui/index';
import Icon from '../ui/Icon';

// Loads the official Razorpay checkout script on demand — same pattern as
// WalletPage's top-up flow, kept local since this modal can mount before
// the wallet page ever has.
let razorpayScriptPromise = null;
const loadRazorpayScript = () => {
  if (window.Razorpay) return Promise.resolve(true);
  if (razorpayScriptPromise) return razorpayScriptPromise;
  razorpayScriptPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
  return razorpayScriptPromise;
};

const STEPS = ["Vehicle", "Charging Goal", "Time Slot", "Review & Pay"];

// Small stepper header — dots connected by a "current" line, echoing the
// app's current-pulse motif (see index.css .cw-current-line) rather than a
// generic progress bar.
const Stepper = ({ current }) => (
  <div className="flex items-center gap-1.5 mb-6">
    {STEPS.map((label, i) => {
      const stepNum = i + 1;
      const active = stepNum === current;
      const done = stepNum < current;
      return (
        <React.Fragment key={label}>
          <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
              style={{
                background: done ? "#10b981" : active ? "linear-gradient(135deg,#5B47E0,#FF8A3D)" : "rgba(255,255,255,0.06)",
                color: done || active ? "#fff" : "#64748b",
                boxShadow: active ? "0 0 12px rgba(255,138,61,0.4)" : "none",
              }}>
              {done ? "✓" : stepNum}
            </div>
            <span className="text-[10px] font-medium hidden sm:block text-center leading-tight"
              style={{ color: active ? "#FF8A3D" : done ? "#10b981" : "#64748b", maxWidth: 68 }}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className="flex-1 h-[2px] rounded-full mb-4 sm:mb-4" style={{ background: done ? "#10b981" : "rgba(255,255,255,0.08)" }} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

const BookingModal = ({ station, charger, car, user, onClose, onConfirmBooking, onDone }) => {
  const [step,          setStep]          = useState(1); // 1-4 wizard steps, 5 = confirmed
  const [timeSlot,      setTimeSlot]      = useState(null);
  const [mode,          setMode]          = useState("percent");
  const [currentPct,    setCurrentPct]    = useState("");
  const [targetPct,     setTargetPct]     = useState(80);
  const [targetMoney,   setTargetMoney]   = useState(200);
  const [paymentMethod, setPaymentMethod] = useState("UPI");

  // Multi-vehicle support — default to the account's primary vehicle
  // (the `car` prop), but let the rider switch if they've saved others.
  const vehicles = user?.cars?.length > 0 ? user.cars : (car ? [car] : []);
  const [selectedVehicleIdx, setSelectedVehicleIdx] = useState(
    Math.max(0, vehicles.findIndex(v => v.vehicleNumber === car?.vehicleNumber))
  );
  const activeVehicle = vehicles[selectedVehicleIdx] || car || {};
  const [vehicleNumber, setVehicleNumber] = useState(activeVehicle?.vehicleNumber || "");
  useEffect(() => { setVehicleNumber(activeVehicle?.vehicleNumber || ""); }, [selectedVehicleIdx]);

  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");
  const [confirmed,     setConfirmed]     = useState(null);

  // Platform-wide pricing rules (fee, discount %, multipliers) — set by
  // admin, applies the same way to every station on the network.
  const [platformConfig, setPlatformConfig] = useState(null);
  useEffect(() => {
    api.get("/platform-config").then(res => { if (res.ok) setPlatformConfig(res.data.config); });
  }, []);

  const batCapacity = activeVehicle?.battery_kwh || 40;
  const carRange    = activeVehicle?.range_km    || 300;
  const carEffic    = activeVehicle?.efficiency  || 7.5;
  const curPct      = Math.min(99, Math.max(0, parseInt(currentPct) || 0));

  // Max energy the battery can still accept from current charge level
  const maxEnergyCanFit = batCapacity * ((100 - curPct) / 100);

  // Peak/off-peak pricing — before a time slot is picked we don't know
  // which window applies yet, so fall back to the station's base rate and
  // a working fee estimate; once timeSlot is set, every cost figure below
  // recalculates against the real time-of-use rate. Multipliers/fees come
  // from the admin-controlled platform config, not the station itself.
  const pricing = platformConfig ? getPricingContext(station, timeSlot, platformConfig) : null;
  const effectiveRate = pricing ? pricing.pricePerKwh : station.price_per_kwh;
  const effectiveFee  = pricing ? pricing.platformFee  : 20;

  const rawEnergy = mode === "percent"
    ? Math.max(0, batCapacity * ((targetPct - curPct) / 100))
    : targetMoney / effectiveRate;

  const energyNeeded = parseFloat(Math.min(rawEnergy, maxEnergyCanFit).toFixed(2));

  const dur        = Math.ceil((energyNeeded / (charger?.power || 50)) * 60);
  const chargeCost = (energyNeeded * effectiveRate).toFixed(2);

  // UPI pays now, so it earns a discount (if this station is eligible —
  // always for Owned stations, Partner stations only if admin opted them
  // in); Cash means a manual collection step at the station, so it
  // carries a small handling surcharge — both amounts are admin-set,
  // platform-wide, not station-specific.
  const discountEligible = platformConfig ? isDiscountEligible(station, platformConfig) : true;
  const upiDiscountPct = platformConfig?.upiDiscountPct ?? 0.05;
  const cashSurcharge  = platformConfig?.cashSurcharge ?? 5;
  const priceAdjustment = paymentMethod === "UPI"
    ? (discountEligible ? -parseFloat((energyNeeded * effectiveRate * upiDiscountPct).toFixed(2)) : 0)
    : cashSurcharge;
  const total = (energyNeeded * effectiveRate + effectiveFee + priceAdjustment).toFixed(2);

  const rangeAdded = Math.round(energyNeeded * carEffic);

  const finalPct = mode === "percent"
    ? targetPct
    : Math.min(100, Math.round(curPct + (energyNeeded / batCapacity * 100)));

  const maxBudget = Math.ceil((maxEnergyCanFit * effectiveRate) / 50) * 50;

  const slots = ["09:00 AM","09:30 AM","10:00 AM","10:30 AM","04:00 PM","04:30 PM","05:00 PM","05:30 PM","06:00 PM","06:30 PM","07:00 PM","07:30 PM"];
  const paymentMethods = [
    { id: "UPI",         icon: "📱", label: "UPI",             active: true, tag: discountEligible ? `Save ${Math.round(upiDiscountPct * 100)}%` : null },
    { id: "Cash",        icon: "💵", label: "Cash on Station",  active: true, tag: `+₹${cashSurcharge} fee` },
    { id: "Credit Card", icon: "💳", label: "Credit Card",     active: false },
    { id: "Debit Card",  icon: "🏧", label: "Debit Card",      active: false },
    { id: "Net Banking", icon: "🏦", label: "Net Banking",     active: false },
  ];

  const vnOk = VEHICLE_NUMBER_REGEX.test(vehicleNumber.replace(/\s/g, ""));

  // Per-step validation gates what "Next" allows.
  const step1Valid = currentPct !== "" && vnOk;
  const step2Valid = mode === "percent" ? targetPct > curPct : targetMoney > 0;
  const step3Valid = !!timeSlot;
  const canBook = step1Valid && step2Valid && step3Valid && energyNeeded > 0;

  const goNext = () => setStep(s => Math.min(4, s + 1));
  const goBack = () => setStep(s => Math.max(1, s - 1));

  const handleConfirm = async () => {
    if (!canBook) return;
    setLoading(true); setError("");

    const res = await api.post("/bookings", {
      stationId: station._id, stationName: station.name, chargerId: charger.id,
      vehicleNumber: vehicleNumber.toUpperCase(), timeSlot,
      date: new Date().toISOString().split("T")[0],
      duration: dur, energyKwh: energyNeeded,
      costPerKwh: effectiveRate, platformFee: effectiveFee,
      totalCost: parseFloat(total), priceAdjustment, paymentMethod,
      currentBattery: curPct, targetBattery: finalPct,
    });

    if (!res.ok) {
      setError(res.error || "Booking failed. Try again.");
      setLoading(false);
      return;
    }

    const newBooking = res.data.booking;

    // Cash on Station — nothing to collect now, station staff take payment
    // when the session completes. Booking is created and that's the flow.
    if (paymentMethod === "Cash") {
      setConfirmed(newBooking); await onConfirmBooking(newBooking); setStep(5);
      setLoading(false);
      return;
    }

    // UPI — actually charge the rider now via Razorpay, same pattern as
    // the wallet top-up flow, tied to this specific booking.
    const orderRes = await api.post("/payments/create-order", { purpose: "booking", bookingId: newBooking._id });
    if (!orderRes.ok) {
      // Booking exists but unpaid — the rider can retry payment, or pay
      // cash at the station; either way the slot isn't lost.
      setError(orderRes.data?.code === "PAYMENTS_NOT_CONFIGURED"
        ? "Online payment isn't set up yet — your slot is booked, please pay cash at the station."
        : (orderRes.error || "Couldn't start payment. Your slot is booked — try paying again from My Bookings."));
      setConfirmed(newBooking); await onConfirmBooking(newBooking); setStep(5);
      setLoading(false);
      return;
    }

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      setError("Couldn't load the payment window. Your slot is booked — try paying again from My Bookings.");
      setConfirmed(newBooking); await onConfirmBooking(newBooking); setStep(5);
      setLoading(false);
      return;
    }

    const { orderId, amount: orderAmount, currency, keyId } = orderRes.data;
    const rzp = new window.Razorpay({
      key: keyId, order_id: orderId, amount: orderAmount, currency,
      name: "ChargeWay", description: `Charging at ${station.name}`,
      theme: { color: "#FF8A3D" },
      prefill: { name: user?.name, email: user?.email, contact: user?.phone },
      handler: async (response) => {
        const verifyRes = await api.post("/payments/verify", {
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          amount: total, purpose: "booking", bookingId: newBooking._id,
        });
        if (verifyRes.ok) {
          setConfirmed(verifyRes.data.booking || newBooking);
        } else {
          setError("Payment succeeded but couldn't be verified — contact support with your payment ID. Your slot is still booked.");
          setConfirmed(newBooking);
        }
        await onConfirmBooking(newBooking);
        setStep(5);
        setLoading(false);
      },
      modal: { ondismiss: () => {
        // Rider closed the payment window — booking still stands as
        // unpaid, they can pay again from My Bookings or pay cash on-site.
        setError("Payment cancelled. Your slot is still booked — pay from My Bookings, or pay cash at the station.");
        setConfirmed(newBooking);
        onConfirmBooking(newBooking);
        setStep(5);
        setLoading(false);
      } },
    });
    rzp.on("payment.failed", () => {
      setError("Payment failed. Your slot is still booked — try again from My Bookings, or pay cash at the station.");
      setConfirmed(newBooking);
      onConfirmBooking(newBooking);
      setStep(5);
      setLoading(false);
    });
    rzp.open();
  };

  // ── Confirmation Screen ──
  if (step === 5 && confirmed) return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <GlassCard className="p-8 max-w-sm w-full text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.1 }}
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: "linear-gradient(135deg,#10b981,#06b6d4)" }}>
          <Icon name="check" className="w-8 h-8 text-white" />
        </motion.div>
        <h2 className="text-hero text-white mb-1">Booking Confirmed!</h2>
        <p className="text-slate-400 text-sm mb-5">Give this code to station staff when you arrive</p>

        {error && <div className="mb-4 text-left"><Alert message={error} type="warning" /></div>}

        <div className="p-6 rounded-2xl mb-4" style={{ background: "linear-gradient(135deg, rgba(91,71,224,0.12), rgba(255,138,61,0.08))", border: "1px solid rgba(255,138,61,0.2)" }}>
          <p className="text-slate-400 text-xs mb-2 uppercase tracking-wider font-semibold">Check-in PIN</p>
          <p className="text-5xl font-black text-[#FF8A3D] cw-figure tracking-[0.25em]">{confirmed.checkInOtp}</p>
          <p className="text-slate-500 text-xs mt-3">Charging starts the moment staff verify this code — not before.</p>
        </div>

        <div className="p-4 rounded-xl text-sm text-left space-y-2 mb-4" style={{ background: "rgba(255,138,61,0.05)", border: "1px solid rgba(255,138,61,0.1)" }}>
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
              <span className={`text-right ${item.mono ? "cw-figure text-xs text-slate-300" : "text-white font-medium"}`}>{item.v}</span>
            </div>
          ))}
          <div className="flex justify-between pt-2 border-t border-white/10">
            <span className="font-bold text-white">Total Paid</span>
            <span className="text-[#FF8A3D] font-black text-lg cw-figure">₹{total}</span>
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
        <Btn onClick={onDone || onClose} className="w-full">Done</Btn>
      </GlassCard>
    </motion.div>
  );

  // ── Multi-step Booking Wizard ──
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        onClick={e => e.stopPropagation()} className="w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <GlassCard className="p-6 sm:p-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-card text-white">Book Charger #{charger.id}</h2>
              <p className="text-slate-400 text-sm">{station.name} · {charger.type} · {charger.power}kW</p>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 border border-white/10 transition-all flex-shrink-0">
              <Icon name="x" className="w-5 h-5" />
            </button>
          </div>

          <Stepper current={step} />

          {error && <div className="mb-4"><Alert message={error} /></div>}

          <AnimatePresence mode="wait">
            {/* ── STEP 1: Vehicle & Battery ── */}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-5">
                {vehicles.length > 1 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Which vehicle?</label>
                    <div className="flex gap-2 flex-wrap">
                      {vehicles.map((v, i) => (
                        <button key={v.vehicleNumber || i} onClick={() => setSelectedVehicleIdx(i)}
                          className="px-3 py-2 rounded-xl text-xs font-semibold border transition-all"
                          style={{
                            background:  i === selectedVehicleIdx ? "rgba(255,138,61,0.12)" : "rgba(255,255,255,0.03)",
                            borderColor: i === selectedVehicleIdx ? "rgba(255,138,61,0.4)" : "rgba(255,255,255,0.08)",
                            color:       i === selectedVehicleIdx ? "#FF8A3D" : "#94a3b8",
                          }}>
                          {v.brand} {v.model}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeVehicle?.brand && (
                  <div className="p-4 rounded-2xl border border-white/10" style={{ background: "rgba(255,138,61,0.04)" }}>
                    <p className="text-xs font-semibold text-[#FF8A3D] mb-2 uppercase tracking-wider">Your Vehicle Info</p>
                    <p className="text-white font-bold text-sm mb-3">{activeVehicle.brand} {activeVehicle.model}</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {[
                        { l: "Capacity", v: `${batCapacity} kWh`, c: "#FF8A3D" },
                        { l: "Max Range", v: `${carRange} km`,    c: "#10b981" },
                        { l: "Charger",  v: charger.type,         c: "#a78bfa" },
                      ].map(i => (
                        <div key={i.l} className="p-2 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
                          <p className="font-bold text-xs cw-figure" style={{ color: i.c }}>{i.v}</p>
                          <p className="text-slate-500 text-xs">{i.l}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Vehicle Number <span className="text-red-400">*</span></label>
                  <input type="text" value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. GJ01AB1234" maxLength={12}
                    className="w-full rounded-xl px-4 py-2.5 text-white text-center cw-figure text-lg tracking-widest outline-none border transition-all"
                    style={{ background: "rgba(255,255,255,0.05)", borderColor: vehicleNumber && !vnOk ? "rgba(248,113,113,0.5)" : vehicleNumber && vnOk ? "rgba(16,185,129,0.5)" : "rgba(255,255,255,0.1)" }} />
                  {vehicleNumber && !vnOk && <p className="text-red-400 text-xs mt-1">Invalid format. Try GJ01AB1234</p>}
                  {vehicleNumber && vnOk  && <p className="text-green-400 text-xs mt-1">✓ Valid vehicle number</p>}
                </div>

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
                      style={{ background: "rgba(255,255,255,0.05)", borderColor: currentPct === "" ? "rgba(255,255,255,0.1)" : "rgba(255,138,61,0.4)" }} />
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
                        <span className="cw-figure">{(batCapacity * curPct / 100).toFixed(1)} / {batCapacity} kWh</span>
                      </div>
                    </div>
                  )}
                </div>

                {currentPct === "" && (
                  <div className="p-3 rounded-xl text-xs text-yellow-400" style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)" }}>
                    ⚡ Enter your current battery % to continue
                  </div>
                )}
              </motion.div>
            )}

            {/* ── STEP 2: Charging Goal ── */}
            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-5">
                <div className="flex rounded-xl p-1" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  {[{ id: "percent", label: "By % Target" }, { id: "money", label: "By ₹ Budget" }].map(o => (
                    <button key={o.id} onClick={() => setMode(o.id)} className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                      style={{ background: mode === o.id ? "linear-gradient(135deg,#5B47E0,#FF8A3D)" : "transparent", color: mode === o.id ? "white" : "#64748b" }}>
                      {o.label}
                    </button>
                  ))}
                </div>

                {mode === "percent" ? (
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-400">From <span className="text-white font-bold">{curPct}%</span></span>
                      <span className="text-[#FF8A3D] font-bold">To {targetPct}%</span>
                    </div>
                    <input type="range" min={curPct + 1} max={100} value={targetPct}
                      onChange={e => setTargetPct(parseInt(e.target.value))}
                      className="w-full accent-[#FF8A3D]" />
                    {energyNeeded > 0 && (
                      <div className="mt-3 p-3 rounded-xl text-sm space-y-1.5" style={{ background: "rgba(255,138,61,0.05)", border: "1px solid rgba(255,138,61,0.08)" }}>
                        <div className="flex justify-between"><span className="text-slate-400">Energy needed</span><span className="text-[#FF8A3D] font-bold cw-figure">{energyNeeded} kWh</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">Range added</span><span className="text-green-400 font-bold cw-figure">+{rangeAdded} km</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">Battery after</span><span className="text-white font-bold cw-figure">{targetPct}% ({(batCapacity * targetPct / 100).toFixed(1)} kWh)</span></div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-400">Budget</span>
                      <span className="text-[#FF8A3D] font-bold cw-figure">₹{targetMoney}</span>
                    </div>
                    <input type="range" min={50} max={maxBudget} step={50} value={Math.min(targetMoney, maxBudget)}
                      onChange={e => setTargetMoney(parseInt(e.target.value))}
                      className="w-full accent-[#FF8A3D]" />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>₹50</span>
                      <span>Max ₹{maxBudget} = full charge</span>
                    </div>
                    {energyNeeded > 0 && (
                      <div className="mt-3 p-3 rounded-xl text-sm space-y-1.5" style={{ background: "rgba(255,138,61,0.05)", border: "1px solid rgba(255,138,61,0.08)" }}>
                        <div className="flex justify-between"><span className="text-slate-400">Energy you get</span><span className="text-[#FF8A3D] font-bold cw-figure">{energyNeeded} kWh</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">Battery after</span><span className="text-white font-bold cw-figure">{finalPct}% ({(batCapacity * finalPct / 100).toFixed(1)} kWh)</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">Range added</span><span className="text-green-400 font-bold cw-figure">+{rangeAdded} km</span></div>
                        {targetMoney > maxBudget && <p className="text-yellow-400 pt-1">⚠️ Budget capped — battery will be full at {finalPct}%</p>}
                      </div>
                    )}
                  </div>
                )}

                {/* Battery preview */}
                {energyNeeded > 0 && (
                  <div className="p-4 rounded-2xl" style={{ background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.15)" }}>
                    <p className="text-xs font-semibold text-green-400 mb-3 uppercase tracking-wider">Battery Preview</p>
                    <div className="flex justify-between text-xs text-slate-400 mb-2">
                      <span>{curPct}% → {finalPct}%</span>
                      <span className="text-green-400">+{rangeAdded} km range</span>
                    </div>
                    <div className="h-4 rounded-full overflow-hidden relative" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="absolute h-full rounded-full opacity-30" style={{ width: `${curPct}%`, background: "linear-gradient(90deg,#10b981,#06b6d4)" }} />
                      <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg,#10b981,#06b6d4)" }}
                        initial={{ width: `${curPct}%` }} animate={{ width: `${finalPct}%` }} transition={{ duration: 1, delay: 0.2 }} />
                    </div>
                    <div className="flex justify-between text-xs mt-1.5">
                      <span className="text-slate-500 cw-figure">{(batCapacity * curPct / 100).toFixed(1)} kWh now</span>
                      <span className="text-green-400 font-semibold cw-figure">{(batCapacity * finalPct / 100).toFixed(1)} kWh after</span>
                    </div>
                  </div>
                )}

                {!step2Valid && (
                  <div className="p-3 rounded-xl text-xs text-red-400" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                    ❌ Target must be higher than current {curPct}%
                  </div>
                )}
              </motion.div>
            )}

            {/* ── STEP 3: Time Slot ── */}
            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-4">
                <p className="text-sm font-medium text-slate-300">Choose an arrival time slot</p>
                {station.peakPricing?.enabled && (
                  <div className="flex items-center gap-2 p-3 rounded-xl text-xs" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
                    <span className="text-base">🌙</span>
                    <span className="text-slate-300">Off-peak slots cost less — look for the <span className="text-green-400 font-semibold">green</span> badge.</span>
                  </div>
                )}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {slots.map(s => {
                    const slotPricing = getPricingContext(station, s, platformConfig);
                    return (
                      <button key={s} onClick={() => setTimeSlot(s)} className="relative py-2.5 px-1 rounded-xl text-xs font-medium transition-all border"
                        style={{ borderColor: timeSlot === s ? "rgba(255,138,61,0.5)" : "rgba(255,255,255,0.08)", background: timeSlot === s ? "rgba(255,138,61,0.1)" : "rgba(255,255,255,0.02)", color: timeSlot === s ? "#FF8A3D" : "#64748b" }}>
                        {s}
                        {station.peakPricing?.enabled && (
                          <span className="absolute -top-1.5 -right-1 w-2 h-2 rounded-full" style={{ background: slotPricing.isPeak ? "#f59e0b" : "#22c55e" }} />
                        )}
                      </button>
                    );
                  })}
                </div>
                {timeSlot && station.peakPricing?.enabled && pricing && (
                  <div className="p-3 rounded-xl text-xs flex items-center justify-between"
                    style={{ background: pricing.isPeak ? "rgba(245,158,11,0.06)" : "rgba(16,185,129,0.06)", border: `1px solid ${pricing.isPeak ? "rgba(245,158,11,0.15)" : "rgba(16,185,129,0.15)"}` }}>
                    <span style={{ color: pricing.isPeak ? "#f59e0b" : "#22c55e" }} className="font-semibold">{pricing.isPeak ? "⚡ Peak Hours" : "🌙 Off-Peak — Lower Rate"}</span>
                    <span className="text-slate-400 cw-figure">₹{pricing.pricePerKwh}/kWh</span>
                  </div>
                )}
                {!timeSlot && (
                  <div className="p-3 rounded-xl text-xs text-slate-400" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    📅 Please select a time slot to continue
                  </div>
                )}
              </motion.div>
            )}

            {/* ── STEP 4: Review & Pay ── */}
            {step === 4 && (
              <motion.div key="s4" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-4">
                <div className="p-5 rounded-2xl" style={{ background: "rgba(255,138,61,0.03)", border: "1px solid rgba(255,138,61,0.1)" }}>
                  <p className="text-sm font-semibold text-slate-300 mb-4">Order Summary</p>
                  <div className="space-y-2.5 text-sm">
                    {[
                      { l: "Vehicle",         v: vehicleNumber.toUpperCase() },
                      { l: "Time Slot",       v: timeSlot },
                      { l: "Energy Needed",   v: `${energyNeeded} kWh` },
                      { l: "Estimated Time",  v: `~${dur} min` },
                      { l: "Rate",            v: `₹${effectiveRate}/kWh${pricing?.label ? ` (${pricing.label})` : ""}` },
                      { l: "Charging Cost",   v: `₹${chargeCost}` },
                      { l: "Platform Fee",    v: `₹${effectiveFee}` },
                      ...(priceAdjustment !== 0 ? [{
                        l: paymentMethod === "UPI" ? "UPI Discount" : "Cash Handling Fee",
                        v: `${priceAdjustment < 0 ? "-" : "+"}₹${Math.abs(priceAdjustment).toFixed(2)}`,
                      }] : []),
                    ].map(i => (
                      <div key={i.l} className="flex justify-between">
                        <span className="text-slate-400">{i.l}</span>
                        <span className="text-white cw-figure">{i.v}</span>
                      </div>
                    ))}
                    <div className="border-t border-white/10 pt-2.5 flex justify-between text-lg font-black">
                      <span className="text-white">Total</span>
                      <span className="text-[#FF8A3D] cw-figure">₹{total}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-300 mb-2">Payment Method</p>
                  <div className="space-y-2">
                    {paymentMethods.map(pm => (
                      <div key={pm.id} onClick={() => pm.active && setPaymentMethod(pm.id)}
                        className="flex items-center gap-3 p-3 rounded-xl border transition-all"
                        style={{ cursor: pm.active ? "pointer" : "not-allowed", opacity: pm.active ? 1 : 0.4, borderColor: paymentMethod === pm.id && pm.active ? "rgba(255,138,61,0.5)" : "rgba(255,255,255,0.08)", background: paymentMethod === pm.id && pm.active ? "rgba(255,138,61,0.08)" : "rgba(255,255,255,0.02)" }}>
                        <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                          style={{ borderColor: paymentMethod === pm.id && pm.active ? "#FF8A3D" : "rgba(255,255,255,0.2)" }}>
                          {paymentMethod === pm.id && pm.active && <div className="w-2 h-2 rounded-full bg-[#FF8A3D]" />}
                        </div>
                        <span className="text-base">{pm.icon}</span>
                        <div className="flex-1">
                          <p className={`text-sm font-semibold ${pm.active ? "text-white" : "text-slate-500"}`}>{pm.label}</p>
                          {!pm.active && <p className="text-xs text-slate-600">Coming Soon</p>}
                          {pm.active && pm.tag && (
                            <p className="text-xs mt-0.5" style={{ color: pm.id === "UPI" ? "#22c55e" : "#f59e0b" }}>{pm.tag}</p>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pm.active ? "text-green-400 bg-green-400/10" : "text-slate-600 bg-white/5"}`}>
                          {pm.active ? "Available" : "Soon"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Wizard nav ── */}
          <div className="flex gap-3 mt-7">
            {step > 1 && <Btn variant="outline" onClick={goBack} className="flex-1">← Back</Btn>}
            {step < 4 && (
              <Btn onClick={goNext} className="flex-1"
                disabled={(step === 1 && !step1Valid) || (step === 2 && !step2Valid) || (step === 3 && !step3Valid)}>
                Continue →
              </Btn>
            )}
            {step === 4 && (
              <Btn onClick={handleConfirm} disabled={!canBook} loading={loading} className="flex-1 text-base">
                {canBook ? `Confirm & Pay ₹${total}` : "Fill all fields"}
              </Btn>
            )}
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
};

export default BookingModal;
