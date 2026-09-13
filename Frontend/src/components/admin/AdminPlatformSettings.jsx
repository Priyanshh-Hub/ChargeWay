import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { api } from '../../api/api';
import { GlassCard, Btn, Spinner } from '../ui/index';
import Icon from '../ui/Icon';

const Field = ({ label, hint, value, onChange, prefix, suffix, step = "1" }) => (
  <div>
    <p className="text-sm text-slate-300 mb-1.5">{label}</p>
    <div className="flex items-center gap-1.5">
      {prefix && <span className="text-slate-500 text-sm">{prefix}</span>}
      <input type="number" step={step} value={value} onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="w-28 rounded-xl px-3 py-2 text-white text-sm cw-figure text-center border outline-none"
        style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }} />
      {suffix && <span className="text-slate-500 text-sm">{suffix}</span>}
    </div>
    {hint && <p className="text-xs text-slate-600 mt-1">{hint}</p>}
  </div>
);

const AdminPlatformSettings = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await api.get("/platform-config");
    if (res.ok) setConfig(res.data.config);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const set = (key) => (val) => setConfig(prev => ({ ...prev, [key]: val }));

  const save = async () => {
    setSaving(true);
    const res = await api.put("/platform-config", config);
    if (res.ok) {
      setConfig(res.data.config);
      toast.success("Platform pricing updated — applies to every station immediately.");
    } else {
      toast.error(res.error || "Couldn't save changes");
    }
    setSaving(false);
  };

  if (loading || !config) return <Spinner />;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-page text-white">Platform Pricing</h1>
        <p className="text-slate-400 text-sm mt-1">
          Set once here, applies to every station on the network — Owned and Partner alike. Stations only control their own base ₹/kWh rate and peak hours.
        </p>
      </div>

      <GlassCard className="p-6 space-y-5">
        <div>
          <p className="text-xs font-semibold text-[#FF8A3D] uppercase tracking-wider mb-3">Platform Fee</p>
          <div className="flex gap-6 flex-wrap">
            <Field label="Peak hours" prefix="₹" value={config.platformFeePeak} onChange={set("platformFeePeak")} />
            <Field label="Off-peak hours" prefix="₹" value={config.platformFeeOffPeak} onChange={set("platformFeeOffPeak")} />
          </div>
        </div>

        <div className="pt-5 border-t border-white/5">
          <p className="text-xs font-semibold text-[#FF8A3D] uppercase tracking-wider mb-3">Default Peak/Off-Peak Multipliers</p>
          <p className="text-xs text-slate-500 mb-3">Applied to a station's base rate wherever it turns on peak pricing.</p>
          <div className="flex gap-6 flex-wrap">
            <Field label="Peak multiplier" value={config.peakMultiplier} onChange={set("peakMultiplier")} step="0.05" suffix="×" />
            <Field label="Off-peak multiplier" value={config.offPeakMultiplier} onChange={set("offPeakMultiplier")} step="0.05" suffix="×" />
          </div>
          <p className="text-xs text-slate-600 mt-2 cw-figure">
            e.g. ₹18/kWh base → Peak ₹{(18 * config.peakMultiplier).toFixed(1)}/kWh · Off-Peak ₹{(18 * config.offPeakMultiplier).toFixed(1)}/kWh
          </p>
        </div>

        <div className="pt-5 border-t border-white/5">
          <p className="text-xs font-semibold text-[#FF8A3D] uppercase tracking-wider mb-3">Prepaid Incentive</p>
          <div className="flex gap-6 flex-wrap items-start">
            <Field label="UPI discount" value={Math.round(config.upiDiscountPct * 100)} onChange={v => set("upiDiscountPct")(v / 100)} suffix="%" />
            <Field label="Cash surcharge" prefix="₹" value={config.cashSurcharge} onChange={set("cashSurcharge")} />
          </div>

          <label className="flex items-center gap-2.5 mt-4 cursor-pointer">
            <button type="button" onClick={() => set("applyDiscountToPartners")(!config.applyDiscountToPartners)}
              className="relative w-10 h-6 rounded-full flex-shrink-0 transition-all"
              style={{ background: config.applyDiscountToPartners ? "#FF8A3D" : "rgba(255,255,255,0.15)" }}>
              <span className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all" style={{ left: config.applyDiscountToPartners ? 20 : 4 }} />
            </button>
            <div>
              <p className="text-sm text-white">Apply UPI discount to Partner stations too</p>
              <p className="text-xs text-slate-500">Off — the discount only applies at ChargeWay-owned stations.</p>
            </div>
          </label>
        </div>
      </GlassCard>

      <Btn onClick={save} loading={saving} className="w-full sm:w-auto">Save Platform Pricing</Btn>
    </div>
  );
};

export default AdminPlatformSettings;
