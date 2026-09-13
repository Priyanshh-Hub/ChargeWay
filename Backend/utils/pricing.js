// Parses a "HH:MM AM/PM" slot string (as used throughout the app) into a
// 24-hour integer hour, or null if unparseable.
function parseSlotHour(slot) {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec((slot || "").trim());
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const isPM = /PM/i.test(m[3]);
  if (isPM && h !== 12) h += 12;
  if (!isPM && h === 12) h = 0;
  return h;
}

// Combines a booking's "YYYY-MM-DD" date with its "HH:MM AM/PM" slot into
// an actual Date — the moment the slot starts. Needed to tell whether a
// check-in is late (see routes/bookings.js PUT /verify-checkin). Returns
// null if either piece is unparseable, so callers can skip the late-fee
// calculation entirely rather than risk one bad string throwing.
function parseSlotDateTime(dateStr, slot) {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec((slot || "").trim());
  if (!m || !dateStr) return null;
  let h = parseInt(m[1], 10);
  const minute = parseInt(m[2], 10);
  const isPM = /PM/i.test(m[3]);
  if (isPM && h !== 12) h += 12;
  if (!isPM && h === 12) h = 0;
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return null;
  d.setHours(h, minute, 0, 0);
  return d;
}

function isPeakHour(hour, pp) {
  if (hour == null || !pp?.enabled) return false;
  const inMorning = hour >= pp.morningStart && hour < pp.morningEnd;
  const inEvening = hour >= pp.eveningStart && hour < pp.eveningEnd;
  return inMorning || inEvening;
}

// Returns the effective per-kWh rate, platform fee, and payment
// discount/surcharge for a station + time slot + payment method — using
// the station's own peak *hours* but the platform-wide multiplier/fee/
// discount amounts from PlatformConfig (admin-controlled, uniform across
// every station, Owned or Partner).
function getPricingContext(station, timeSlot, paymentMethod, platformConfig) {
  const pp = station.peakPricing || {};
  const basePrice = station.price_per_kwh;
  const cfg = platformConfig;

  const hour = parseSlotHour(timeSlot);
  const peak = isPeakHour(hour, pp);

  const pricePerKwh = pp.enabled
    ? parseFloat((basePrice * (peak ? cfg.peakMultiplier : cfg.offPeakMultiplier)).toFixed(2))
    : basePrice;
  const platformFee = pp.enabled
    ? (peak ? cfg.platformFeePeak : cfg.platformFeeOffPeak)
    : cfg.platformFeeOffPeak;

  const discountEligible = station.networkType === "Owned" || cfg.applyDiscountToPartners;
  let priceAdjustment = 0;
  if (paymentMethod === "UPI" && discountEligible) {
    priceAdjustment = -parseFloat((pricePerKwh * cfg.upiDiscountPct).toFixed(2)) * 1; // per-kWh; multiplied by energy elsewhere
  } else if (paymentMethod === "Cash") {
    priceAdjustment = cfg.cashSurcharge;
  }

  return {
    isPeak: pp.enabled && peak,
    pricePerKwh, platformFee, priceAdjustment,
    label: pp.enabled ? (peak ? "Peak Hours" : "Off-Peak — Lower Rate") : null,
    discountEligible,
  };
}

module.exports = { parseSlotHour, parseSlotDateTime, isPeakHour, getPricingContext };
