import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, setToken } from '../../api/api';
import { NAME_REGEX, INDIAN_MOBILE_REGEX, EMAIL_REGEX } from '../../constants/validation';
import { isPasswordAcceptable } from '../../utils/passwordStrength';
import { GlassCard, InputField, PasswordInput, Checkbox, Btn, Alert, Modal } from '../ui/index';
import Icon from '../ui/Icon';
import Logo from '../ui/Logo';

const Register = ({ onLogin, onNavigate }) => {
  const [step, setStep] = useState(1); // 1 personal, 2 station location, 3 station setup, 4 success
  const [role, setRole] = useState("User");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [generalError, setGeneralError] = useState("");
  const [termsOpen, setTermsOpen] = useState(false);

  const [personal, setPersonal] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "", acceptedTerms: false });
  const [stationInfo, setStationInfo] = useState({ stationName: "", stationAddress: "", lat: "", lng: "" });
  const [stationDetails, setStationDetails] = useState({
    pricePerKwh: "18",
    facilities: [],
    chargers: [{ type: "DC Fast", power: "50", count: "2" }],
  });
  const [registeredUser, setRegisteredUser] = useState(null);
  const [devVerifyUrl, setDevVerifyUrl] = useState("");

  const facilityOptions = ["Wi-Fi","Restroom","Cafe","Parking","CCTV","24/7 Open","Air Conditioning","EV Shop","Waiting Area"];
  const chargerTypes    = ["DC Fast","AC Slow","DC Ultra-Fast","AC Level 2"];

  const fp = (k) => (e) => setPersonal(p => ({ ...p, [k]: e.target.value }));
  const sp = (k) => (e) => setStationInfo(p => ({ ...p, [k]: e.target.value }));

  // ── Live, per-field validation (runs on blur) ────────────────
  const validateField = (field) => {
    setTouched(t => ({ ...t, [field]: true }));
    const e = { ...errors };
    if (field === "name") {
      e.name = !personal.name.trim() ? "Full name is required" : !NAME_REGEX.test(personal.name) ? "Letters and spaces only" : undefined;
    }
    if (field === "email") {
      e.email = !personal.email.trim() ? "Email is required" : !EMAIL_REGEX.test(personal.email) ? "Invalid email address" : undefined;
    }
    if (field === "phone") {
      e.phone = !personal.phone.trim() ? "Phone number is required" : !INDIAN_MOBILE_REGEX.test(personal.phone) ? "Valid 10-digit Indian number" : undefined;
    }
    if (field === "password") {
      e.password = !isPasswordAcceptable(personal.password) ? "Minimum 8 characters" : undefined;
    }
    if (field === "confirmPassword") {
      e.confirmPassword = personal.password !== personal.confirmPassword ? "Passwords do not match" : undefined;
    }
    setErrors(e);
  };

  const validateStep1 = () => {
    const e = {};
    if (!personal.name.trim())                                     e.name            = "Full name is required";
    else if (!NAME_REGEX.test(personal.name))                      e.name            = "Letters and spaces only";
    if (!personal.email.trim())                                    e.email           = "Email is required";
    else if (!EMAIL_REGEX.test(personal.email))                    e.email           = "Invalid email address";
    if (!personal.phone.trim())                                    e.phone           = "Phone number is required";
    else if (!INDIAN_MOBILE_REGEX.test(personal.phone))            e.phone           = "Valid 10-digit Indian number";
    if (!isPasswordAcceptable(personal.password))                  e.password        = "Minimum 8 characters";
    if (personal.password !== personal.confirmPassword)            e.confirmPassword = "Passwords do not match";
    if (!personal.acceptedTerms)                                   e.acceptedTerms   = "You must accept the Terms & Conditions to continue";
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
    if (role === "Station Manager") {
      if (!validateStep3()) return;
      if (!personal.acceptedTerms) { setErrors(e => ({ ...e, acceptedTerms: "You must accept the Terms & Conditions" })); return; }
    }
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
    if (res.ok) {
      setToken(res.data.token);
      setRegisteredUser(res.data.user);
      setDevVerifyUrl(res.data.devVerifyUrl || "");
      setStep(4);
    } else if (res.code === "EMAIL_EXISTS") {
      setStep(1);
      setErrors(e => ({ ...e, email: "This email is already registered. Try signing in instead." }));
      setGeneralError("An account with this email already exists.");
    } else {
      setGeneralError(res.error || "Registration failed. Please try again.");
    }
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

  if (step === 4 && registeredUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md text-center">
          <GlassCard className="p-8">
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
              className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-5"
              style={{ background: "linear-gradient(135deg,#10b981,#06b6d4)" }}>
              <Icon name="check" className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-2xl font-black text-white mb-1">🎉 Welcome to ChargeWay</h1>
            <p className="text-slate-400 text-sm mb-5">Your account has been created, {registeredUser.name.split(" ")[0]}.</p>

            <div className="p-3 rounded-xl text-left text-xs space-y-1.5 mb-6" style={{ background: "rgba(0,196,255,0.05)", border: "1px solid rgba(0,196,255,0.15)" }}>
              <p className="text-cyan-400 font-semibold flex items-center gap-1.5"><Icon name="mail" className="w-3.5 h-3.5" /> Verify your email</p>
              <p className="text-slate-400">We've sent a verification link to <span className="text-white">{registeredUser.email}</span>. You can keep using ChargeWay in the meantime.</p>
              {devVerifyUrl && (
                <p className="text-slate-500 pt-1">
                  Dev mode — no email server configured. <span className="text-cyan-400">Verification would open:</span> <code className="text-slate-400">{devVerifyUrl}</code>
                </p>
              )}
            </div>

            <Btn onClick={() => onLogin(registeredUser)} className="w-full">Continue →</Btn>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-10">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Logo size="md" className="mb-4 justify-center" />
          <h1 className="text-hero text-white">Create Account</h1>
          <p className="text-slate-400 mt-1 text-sm">Start your EV charging journey.</p>
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
                <InputField label="Full Name"     value={personal.name}  onChange={fp("name")}  onBlur={() => validateField("name")}  error={errors.name}  valid={touched.name && !errors.name && personal.name.trim().length > 0} placeholder="Priyansh Patel"  required />
                <InputField label="Email Address" type="email" value={personal.email} onChange={fp("email")} onBlur={() => validateField("email")} error={errors.email} valid={touched.email && !errors.email && personal.email.trim().length > 0} placeholder="you@example.com" required />
                <InputField label="Phone Number"  type="tel"   value={personal.phone} onChange={fp("phone")} onBlur={() => validateField("phone")} error={errors.phone} valid={touched.phone && !errors.phone && personal.phone.trim().length > 0} placeholder="9XXXXXXXXX" required />
                <PasswordInput
                  label="Password" value={personal.password}
                  onChange={e => { fp("password")(e); }}
                  error={errors.password} placeholder="Minimum 8 characters, letters + numbers"
                  showStrength showRules required
                />
                <PasswordInput
                  label="Confirm Password" value={personal.confirmPassword} onChange={fp("confirmPassword")}
                  error={errors.confirmPassword} placeholder="Re-enter password" required
                />
                <Checkbox
                  id="accept-terms"
                  checked={personal.acceptedTerms}
                  onChange={(v) => setPersonal(p => ({ ...p, acceptedTerms: v }))}
                  error={errors.acceptedTerms}
                  label={<>I agree to the <button type="button" onClick={(e) => { e.preventDefault(); setTermsOpen(true); }} className="text-cyan-400 underline hover:text-cyan-300">Terms & Conditions</button> and Privacy Policy</>}
                />
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
                 <p className="text-xs text-slate-400 mb-2 font-medium">Quick fill — Major Cities:</p>
<div className="flex flex-wrap gap-2">
  {[
    { city: "Ahmedabad", lat: "23.0225", lng: "72.5714" },
    { city: "Mumbai",    lat: "19.0760", lng: "72.8777" },
    { city: "Bangalore", lat: "12.9716", lng: "77.5946" },
    { city: "Hyderabad", lat: "17.3850", lng: "78.4867" },
    { city: "Udaipur",   lat: "24.5854", lng: "73.7125" },
  ].map(c => (
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

      <Modal open={termsOpen} onClose={() => setTermsOpen(false)} title="Terms & Conditions" maxWidth="max-w-lg">
  <div className="text-sm text-slate-400 space-y-3 max-h-96 overflow-y-auto pr-1">
    <p><strong className="text-white">1. Acceptance of Terms</strong><br />
    By creating a ChargeWay account, you agree to be bound by these Terms & Conditions and our Privacy Policy. If you do not agree, please do not use the platform.</p>

    <p><strong className="text-white">2. What ChargeWay Does</strong><br />
    ChargeWay is a platform for discovering, booking, and paying for EV charging sessions at partner stations, and for Station Managers to list and manage their charging stations on the platform.</p>

    <p><strong className="text-white">3. Account Responsibilities</strong><br />
    You are responsible for the accuracy of the information you provide (including vehicle and contact details) and for keeping your login credentials confidential. You must be legally able to enter into agreements to register.</p>

    <p><strong className="text-white">4. Bookings & Cancellations</strong><br />
    Booking a charging slot reserves that charger for the selected time window. Please cancel bookings you no longer need so the slot remains available to other drivers. Repeated no-shows may result in booking restrictions.</p>

    <p><strong className="text-white">5. Payments</strong><br />
    Charges shown at checkout reflect the station's published pricing plus any applicable platform fee and taxes (GST). Payment is due at the time of booking or session completion, as indicated in the app.</p>

    <p><strong className="text-white">6. Station Manager Obligations</strong><br />
    Station Managers are responsible for keeping charger availability, pricing, and station information accurate and up to date, and for ensuring listed chargers are safe and functional.</p>

    <p><strong className="text-white">7. Prohibited Use</strong><br />
    You agree not to misuse the platform — including falsifying bookings, interfering with other users' access to chargers, or attempting to access accounts or data that isn't yours.</p>

    <p><strong className="text-white">8. Limitation of Liability</strong><br />
    ChargeWay facilitates bookings between drivers and station operators but is not responsible for the physical condition of charging equipment, vehicle damage, or delays caused by third parties. Use charging stations at your own risk and in accordance with posted safety instructions.</p>

    <p><strong className="text-white">9. Account Suspension & Termination</strong><br />
    We may suspend or terminate accounts that violate these terms. You may delete your own account at any time from your Profile settings.</p>

    <p><strong className="text-white">10. Changes to These Terms</strong><br />
    We may update these terms from time to time. Continued use of ChargeWay after changes means you accept the updated terms.</p>

    <p><strong className="text-white">11. Governing Law</strong><br />
    These terms are governed by the laws of India.</p>

    <p><strong className="text-white">12. Contact</strong><br />
    Questions about these terms can be reached at support@chargeway.com.</p>

    <p><strong className="text-white">13. Privacy</strong><br />
    We collect your name, email, phone, vehicle, and booking details to operate your account. We never sell your data to third parties. You can delete your account and data anytime from Profile → Danger Zone.</p>
  </div>
  <Btn onClick={() => setTermsOpen(false)} className="w-full mt-5">Close</Btn>
</Modal>
    </div>
  );
};

export default Register;
