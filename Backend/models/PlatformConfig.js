const mongoose = require("mongoose");

// Singleton document — always exactly one, fetched/updated via getConfig()/
// setConfig() below rather than a normal find/findById, so callers never
// have to think about the _id.
const PlatformConfigSchema = new mongoose.Schema({
  singleton: { type: String, default: "singleton", unique: true },

  // Platform fee — decided once by admin, applied to every booking on
  // every station (Owned or Partner) regardless of who runs the charger.
  platformFeePeak:    { type: Number, default: 25, min: 0 },
  platformFeeOffPeak: { type: Number, default: 12, min: 0 },

  // Default energy-price multipliers used whenever a station turns on
  // peak pricing (see Station.peakPricing.enabled) — the station only
  // controls its own peak *hours*, not how much more/less that costs.
  peakMultiplier:    { type: Number, default: 1.20, min: 1 },
  offPeakMultiplier: { type: Number, default: 0.85, max: 1 },

  // Prepaid (UPI) incentive vs. pay-at-station handling fee — platform-wide.
  upiDiscountPct: { type: Number, default: 0.05, min: 0, max: 0.5 },
  cashSurcharge:  { type: Number, default: 5, min: 0 },

  // Whether the UPI discount also applies at Partner (third-party)
  // stations, or only at ChargeWay-owned ones — partner economics can
  // differ, so admin gets to decide this explicitly rather than it being
  // assumed either way.
  applyDiscountToPartners: { type: Boolean, default: true },

  // ChargeWay's cut of a Partner station's ENERGY revenue (the platform
  // fee above is separate and already 100% ChargeWay's, on every station).
  // On an Owned station there's no third party to pay out, so ChargeWay
  // keeps 100% of energy revenue there regardless of this number — it only
  // affects the split computed for Partner-station bookings. See
  // routes/bookings.js for where this is snapshotted onto each booking.
  partnerCommissionPct: { type: Number, default: 0.15, min: 0, max: 0.5 },

  // Late arrival fee — a booking claims a specific charger for a specific
  // slot; if the rider shows up late, that charger sat reserved and idle
  // for other riders in the meantime. Grace period is minutes after the
  // slot start before the fee kicks in at all; after that it accrues
  // per minute. Applied once, at check-in verification (see
  // routes/bookings.js PUT /verify-checkin) — never recomputed later.
  lateGraceMinutes:  { type: Number, default: 10, min: 0 },
  lateFeePerMinute:  { type: Number, default: 2, min: 0 },
}, { timestamps: true });

const PlatformConfig = mongoose.model("PlatformConfig", PlatformConfigSchema);

async function getConfig() {
  let cfg = await PlatformConfig.findOne({ singleton: "singleton" });
  if (!cfg) cfg = await PlatformConfig.create({ singleton: "singleton" });
  return cfg;
}

async function setConfig(updates) {
  const cfg = await getConfig();
  Object.assign(cfg, updates);
  await cfg.save();
  return cfg;
}

module.exports = { PlatformConfig, getConfig, setConfig };
