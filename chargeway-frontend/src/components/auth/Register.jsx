import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, setToken } from '../../api/api';
import { NAME_REGEX, INDIAN_MOBILE_REGEX, EMAIL_REGEX } from '../../constants/validation';
import { GlassCard, InputField, Btn, Alert } from '../ui/index';
import Icon from '../ui/Icon';

const Register = ({ onLogin, onNavigate }) => {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState("User");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState("");

  const [personal, setPersonal] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [stationInfo, setStationInfo] = useState({ stationName: "", stationAddress: "", lat: "", lng: "" });
  const [stationDetails, setStationDetails] = useState({
    pricePerKwh: "18",
    facilities: [],
    chargers: [{ type: "DC Fast", power: "50", count: "2" }],
  });

  const facilityOptions = ["Wi-Fi","Restroom","Cafe","Parking","CCTV","24/7 Open","Air Conditioning","EV Shop","Waiting Area"];
  const chargerTypes    = ["DC Fast","AC Slow","DC Ultra-Fast","AC Level 2"];

  const fp = (k) => (e) => setPersonal(p => ({ ...p, [k]: e.target.value }));
  const sp = (k) => (e) => setStationInfo(p => ({ ...p, [k]: e.target.value }));

  const validateStep1 = () => {
    const e = {};
    if (!NAME_REGEX.test(personal.name))                           e.name            = "Letters and spaces only";
    if (!EMAIL_REGEX.test(personal.email))                         e.email           = "Invalid email address";
    if (!INDIAN_MOBILE_REGEX.test(personal.phone))                 e.phone           = "Valid 10-digit Indian number";
    if (personal.password.length < 6)                              e.password        = "Minimum 6 characters";
    if (personal.password !== personal.confirmPassword)            e.confirmPassword = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e = {};
    if (!stationInfo.stationName.trim())                           e.stationName    = "Station name is required";
    if (stationInfo.stationAddress.length < 10)                    e.stationAddress = "Please enter a detailed address";
    const lat = parseFloat(stationInfo.lat), lng = parseFloat(stationInfo.lng);
    if (!stationInfo.lat || isNaN(lat) || lat < -90 || lat > 90)  e.lat = "Valid latitude between -90 and 90";
    if (!stationInfo.lng || isNaN(lng) || lng < -180 || lng > 180) e.lng = "Valid longitude between -180 and 180";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep3 = () => {
    const e = {};
    if (!stationDetails.pricePerKwh || parseFloat(stationDetails.pricePerKwh) <= 0) e.pricePerKwh = "Enter a valid price";
    if (stationDetails.chargers.length === 0)                                        e.chargers    = "Add at least one charger";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleStep1Next = () => {
    if (!validateStep1()) return;
    if (role === "User") handleFinalSubmit();
    else setStep(2);
  };

  const handleStep2Next = () => {
    if (!validateStep2()) return;
    setStep(3);
  };

  const toggleFacility = (f) => setStationDetails(p => ({
    ...p, facilities: p.facilities.includes(f) ? p.facilities.filter(x => x !== f) : [...p.facilities, f],
  }));

  const addCharger    = ()           => setStationDetails(p => ({ ...p, chargers: [...p.chargers, { type: "DC Fast", power: "50", count: "1" }] }));
  const removeCharger = (i)          => setStationDetails(p => ({ ...p, chargers: p.chargers.filter((_, idx) => idx !== i) }));
  const updateCharger = (i, k, v)   => setStationDetails(p => ({ ...p, chargers: p.chargers.map((c, idx) => idx === i ? { ...c, [k]: v } : c) }));

  const handleFinalSubmit = async () => {
    if (role === "Station Manager" && !validateStep3()) return;
    setLoading(true); setGeneralError("");

    const chargersArray = [];
    let cid = 1;
    stationDetails.chargers.forEach(c => {
      for (let i = 0; i < (parseInt(c.count) || 1); i++)
        chargersArray.push({ id: cid++, status: "Available", type: c.type, power: parseFloat(c.power) || 50 });
    });

    const payload = {
      name: personal.name, email: personal.email, phone: personal.phone,
      password: personal.password, role,
      ...(role === "Station Manager" && {
        stationName: stationInfo.stationName, stationAddress: stationInfo.stationAddress,
        stationLat: parseFloat(stationInfo.lat), stationLng: parseFloat(stationInfo.lng),
        stationPricePerKwh: parseFloat(stationDetails.pricePerKwh),
        stationFacilities: stationDetails.facilities, stationChargers: chargersArray,
      }),
    };

    const res = await api.post("/auth/register", payload);
    if (res.ok) { setToken(res.data.token); onLogin(res.data.user); }
    else setGeneralError(res.error || "Registration failed. Please try again.");
    setLoading(false);
  };

  const StepIndicator = () => {
    const steps = ["Personal Info", "Station Location", "Station Setup"];
    return (
      <div className="flex items-center justify-center mb-8 gap-2">
        {steps.map((label, i) => {
          const num = i + 1, isActive = step === num, isDone = step > num;
          return (
            <React.Fragment key={num}>
              <div className="flex flex-col items-center gap-1">
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm transition-all duration-300"
                  style={{ background: isDone ? "linear-gradient(135deg,#10b981,#06b6d4)" : isActive ? "linear-gradient(135deg,#0066FF,#00C4FF)" : "rgba(255,255,255,0.08)", border: isActive ? "2px solid rgba(0,196,255,0.5)" : "2px solid transparent", color: isActive || isDone ? "white" : "#64748b", boxShadow: isActive ? "0 0 20px rgba(0,196,255,0.3)" : "none" }}>
                  {isDone ? "✓" : num}
                </div>
                <p className="text-xs font-medium hidden sm:block" style={{ color: isActive ? "#00C4FF" : isDone ? "#10b981" : "#475569" }}>{label}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="flex-1 h-0.5 mb-4 mx-1 rounded-full transition-all duration-500"
                  style={{ background: step > num ? "linear-gradient(90deg,#10b981,#06b6d4)" : "rgba(255,255,255,0.08)", maxWidth: "60px" }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-10">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: "linear-gradient(135deg, #0066FF, #00C4FF)" }}>
            <Icon name="bolt" className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white">Create Account</h1>
          <p className="text-slate-400 mt-1 text-sm">Join the EV revolution</p>
        </div>

        {step === 1 && (
          <div className="flex rounded-2xl p-1 mb-6" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            {["User", "Station Manager"].map(r => (
              <button key={r} onClick={() => { setRole(r); setErrors({}); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                style={{ background: role === r ? "linear-gradient(135deg,#0066FF,#00C4FF)" : "transparent", color: role === r ? "white" : "#64748b" }}>
                {r === "User" ? "👤 User" : "🏪 Station Manager"}
              </button>
            ))}
          </div>
        )}

        {role === "Station Manager" && <StepIndicator />}

        <GlassCard className="p-8">
          {generalError && <Alert message={generalError} />}

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="mb-4"><h2 className="text-lg font-black text-white">Personal Information</h2><p className="text-slate-400 text-xs mt-0.5">Tell us about yourself</p></div>
                <InputField label="Full Name"        value={personal.name}            onChange={fp("name")}            error={errors.name}            placeholder="Priyansh Patel"    required />
                <InputField label="Email Address"    type="email" value={personal.email}  onChange={fp("email")}  error={errors.email}  placeholder="you@example.com"   required />
                <InputField label="Phone Number"     type="tel"   value={personal.phone}  onChange={fp("phone")}  error={errors.phone}  placeholder="9XXXXXXXXX"         required />
                <InputField label="Password"         type="password" value={personal.password}        onChange={fp("password")}        error={errors.password}        placeholder="Minimum 6 characters" required />
                <InputField label="Confirm Password" type="password" value={personal.confirmPassword} onChange={fp("confirmPassword")} error={errors.confirmPassword} placeholder="Re-enter password"    required />
                <Btn onClick={handleStep1Next} loading={loading} className="w-full mt-2">
                  {role === "User" ? "Create Account" : "Next — Station Location →"}
                </Btn>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="mb-4"><h2 className="text-lg font-black text-white">Station Location</h2><p className="text-slate-400 text-xs mt-0.5">Where is your charging station?</p></div>
                <InputField label="Station Name" value={stationInfo.stationName}    onChange={sp("stationName")}    error={errors.stationName}    placeholder="e.g. Chargeway Hub Ahmedabad" required />
                <InputField label="Full Address" value={stationInfo.stationAddress} onChange={sp("stationAddress")} error={errors.stationAddress} placeholder="e.g. SG Highway, Ahmedabad"    required />
                <div className="grid grid-cols-2 gap-3">
                  <InputField label="Latitude"  value={stationInfo.lat} onChange={sp("lat")} error={errors.lat} placeholder="e.g. 23.0225" required />
                  <InputField label="Longitude" value={stationInfo.lng} onChange={sp("lng")} error={errors.lng} placeholder="e.g. 72.5714" required />
                </div>
                <div className="p-3 rounded-xl text-xs space-y-1" style={{ background: "rgba(0,196,255,0.05)", border: "1px solid rgba(0,196,255,0.15)" }}>
                  <p className="text-cyan-400 font-semibold">📍 How to find Latitude & Longitude</p>
                  <p className="text-slate-400">Open Google Maps → Search location → Right-click → Click coordinates at top</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-2 font-medium">Quick fill — Gujarat Cities:</p>
                  <div className="flex flex-wrap gap-2">
                    {[{ city: "Ahmedabad", lat: "23.0225", lng: "72.5714" }, { city: "Surat", lat: "21.1702", lng: "72.8311" }, { city: "Vadodara", lat: "22.3072", lng: "73.1812" }, { city: "Rajkot", lat: "22.3039", lng: "70.8022" }, { city: "Gandhinagar", lat: "23.2156", lng: "72.6369" }].map(c => (
                      <button key={c.city} onClick={() => setStationInfo(p => ({ ...p, lat: c.lat, lng: c.lng }))}
                        className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:border-cyan-400/40 hover:text-cyan-400 transition-all"
                        style={{ background: "rgba(255,255,255,0.03)" }}>{c.city}</button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <Btn variant="ghost" onClick={() => setStep(1)} className="flex-1">← Back</Btn>
                  <Btn onClick={handleStep2Next} className="flex-1">Next — Station Setup →</Btn>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div className="mb-4"><h2 className="text-lg font-black text-white">Station Setup</h2><p className="text-slate-400 text-xs mt-0.5">Configure your chargers and amenities</p></div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Charging Price <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400 font-bold text-sm">₹</span>
                    <input type="number" value={stationDetails.pricePerKwh} onChange={e => setStationDetails(p => ({ ...p, pricePerKwh: e.target.value }))}
                      placeholder="18" min="1" className="w-full rounded-xl pl-8 pr-16 py-2.5 text-white text-sm outline-none border"
                      style={{ background: "rgba(255,255,255,0.05)", borderColor: errors.pricePerKwh ? "rgba(248,113,113,0.5)" : "rgba(255,255,255,0.1)" }} />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs">/kWh</span>
                  </div>
                  {errors.pricePerKwh && <p className="text-red-400 text-xs mt-1">{errors.pricePerKwh}</p>}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-300">Chargers <span className="text-red-400">*</span></label>
                    <button onClick={addCharger} className="text-xs px-3 py-1 rounded-lg font-medium text-cyan-400 border border-cyan-400/30 hover:bg-cyan-400/10 transition-all">+ Add Charger</button>
                  </div>
                  {errors.chargers && <p className="text-red-400 text-xs mb-2">{errors.chargers}</p>}
                  <div className="space-y-2">
                    {stationDetails.chargers.map((c, i) => (
                      <div key={i} className="p-3 rounded-xl border border-white/10 flex items-center gap-2" style={{ background: "rgba(255,255,255,0.03)" }}>
                        <select value={c.type} onChange={e => updateCharger(i, "type", e.target.value)} className="flex-1 text-xs rounded-lg px-2 py-2 outline-none border text-white" style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }}>
                          {chargerTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <div className="relative w-24">
                          <input type="number" value={c.power} onChange={e => updateCharger(i, "power", e.target.value)} placeholder="50"
                            className="w-full text-xs rounded-lg px-2 pr-8 py-2 text-white outline-none border" style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }} />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">kW</span>
                        </div>
                        <div className="relative w-20">
                          <input type="number" value={c.count} onChange={e => updateCharger(i, "count", e.target.value)} min="1" max="20" placeholder="2"
                            className="w-full text-xs rounded-lg px-2 pr-6 py-2 text-white outline-none border" style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }} />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">×</span>
                        </div>
                        {stationDetails.chargers.length > 1 && (
                          <button onClick={() => removeCharger(i)} className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-400/10 transition-all flex-shrink-0">
                            <Icon name="x" className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Total chargers: <span className="text-cyan-400 font-bold">{stationDetails.chargers.reduce((s, c) => s + (parseInt(c.count) || 0), 0)}</span></p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Amenities / Facilities</label>
                  <div className="flex flex-wrap gap-2">
                    {facilityOptions.map(f => {
                      const selected = stationDetails.facilities.includes(f);
                      return (
                        <button key={f} onClick={() => toggleFacility(f)}
                          className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all border"
                          style={{ background: selected ? "rgba(0,196,255,0.15)" : "rgba(255,255,255,0.03)", borderColor: selected ? "rgba(0,196,255,0.5)" : "rgba(255,255,255,0.1)", color: selected ? "#00C4FF" : "#64748b" }}>
                          {selected ? "✓ " : ""}{f}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <Btn variant="ghost" onClick={() => setStep(2)} className="flex-1">← Back</Btn>
                  <Btn onClick={handleFinalSubmit} loading={loading} className="flex-1">Create Account ✓</Btn>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {step === 1 && (
            <p className="text-center text-slate-400 text-sm mt-5">
              Have an account?{" "}
              <button onClick={() => onNavigate("login")} className="text-cyan-400 font-semibold hover:text-cyan-300">Sign In</button>
            </p>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
};

export default Register;
