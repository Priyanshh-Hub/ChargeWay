// Mirrors Backend/utils/pricing.js — pricing STRUCTURE (multipliers, fees,
// discount %) now comes from the platform-wide config an admin controls
// (fetched once via GET /api/platform-config), not from each station.
// Stations only control their own peak *hours* and base ₹/kWh rate.

export function parseSlotHour(slot) {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec((slot || "").trim());
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const isPM = /PM/i.test(m[3]);
  if (isPM && h !== 12) h += 12;
  if (!isPM && h === 12) h = 0;
  return h;
}

export function isPeakHour(hour, pp) {
  if (hour == null || !pp?.enabled) return false;
  const inMorning = hour >= pp.morningStart && hour < pp.morningEnd;
  const inEvening = hour >= pp.eveningStart && hour < pp.eveningEnd;
  return inMorning || inEvening;
}

/**
 * @param {object} station - price_per_kwh, peakPricing (hours only), networkType
 * @param {string|null} timeSlot - "HH:MM AM/PM", or null to use the current hour
 * @param {object} platformConfig - admin-controlled global pricing config
 * @returns {{ isPeak, pricePerKwh, platformFee, label }}
 */
export function getPricingContext(station, timeSlot, platformConfig) {
  const pp = station?.peakPricing || {};
  const basePrice = station?.price_per_kwh ?? 0;
  const cfg = platformConfig || {};
  const hour = timeSlot === null ? new Date().getHours() : parseSlotHour(timeSlot);
  const peak = isPeakHour(hour, pp);

  const pricePerKwh = pp.enabled
    ? parseFloat((basePrice * (peak ? (cfg.peakMultiplier ?? 1.2) : (cfg.offPeakMultiplier ?? 0.85))).toFixed(2))
    : basePrice;
  const platformFee = pp.enabled
    ? (peak ? (cfg.platformFeePeak ?? 25) : (cfg.platformFeeOffPeak ?? 12))
    : (cfg.platformFeeOffPeak ?? 20);

  return {
    isPeak: pp.enabled && peak,
    pricePerKwh, platformFee,
    label: pp.enabled ? (peak ? "Peak Hours" : "Off-Peak — Lower Rate") : null,
  };
}

/**
 * Whether the prepaid/UPI discount applies to this station — Owned
 * stations always get it; Partner stations only if admin opted them in.
 */
export function isDiscountEligible(station, platformConfig) {
  return station?.networkType !== "Partner" || !!platformConfig?.applyDiscountToPartners;
}
