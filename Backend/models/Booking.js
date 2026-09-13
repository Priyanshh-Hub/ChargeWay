const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema({
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  stationId:     { type: mongoose.Schema.Types.ObjectId, ref: "Station", required: true, index: true },
  stationName:   { type: String },
  chargerId:     { type: Number },
  vehicleNumber: { type: String },
  timeSlot:      { type: String },
  date:          { type: String, index: true },
  duration:      { type: Number },
  energyKwh:     { type: Number },
  costPerKwh:    { type: Number },
  platformFee:   { type: Number, default: 30 },
  totalCost:     { type: Number },
  // Discount (negative) or surcharge (positive) baked into totalCost above —
  // kept separately purely so the invoice can show *why* the total is what
  // it is (e.g. "-₹8 UPI discount" or "+₹5 station fee").
  priceAdjustment: { type: Number, default: 0 },

  // Revenue split — snapshotted at booking creation (same principle as
  // costPerKwh/platformFee above: never recompute historical money from
  // today's config, since partnerCommissionPct can change later). Only
  // meaningful when networkTypeAtBooking is "Partner"; on an Owned
  // station ChargeWay keeps 100% of energy revenue so both are 0.
  //   energyRevenue (= costPerKwh * energyKwh) splits into:
  //     partnerPayout    → what the third-party station operator earns
  //     partnerCommission → ChargeWay's cut of that energy revenue
  //   ChargeWay's total take on this booking = platformFee + partnerCommission
  //   (+ the full energyRevenue too, on an Owned station).
  networkTypeAtBooking: { type: String, enum: ["Owned", "Partner"], default: "Owned" },
  partnerCommission:    { type: Number, default: 0 },
  partnerPayout:        { type: Number, default: 0 },

  status:        { type: String, enum: ["Upcoming", "Completed", "Cancelled"], default: "Upcoming", index: true },
  paymentMethod: { type: String, enum: ["UPI", "Cash"], default: "UPI" },
  // "unpaid" until a Razorpay payment is verified (UPI) or cash is
  // collected and the manager completes the session (Cash); see
  // routes/payments.js and the /complete route below.
  paymentStatus: { type: String, enum: ["unpaid", "paid", "refunded"], default: "unpaid" },
  invoiceNo:     { type: String, default: null, unique: true, sparse: true }, // ← global sequential e.g. CW-2026-0001; sparse since most bookings have none until completed

  // Rider check-in verification — a short numeric PIN (shown to the rider,
  // read aloud to station staff — the Uber/Rapido pattern).
  checkInOtp:  { type: String },
  checkedIn:   { type: Boolean, default: false },
  checkedInAt: { type: Date, default: null },
  // Nominal per-minute fine for arriving late — computed once, at the
  // moment of check-in verification, from how far past the booked slot
  // start the rider actually showed up. See PUT /verify-checkin.
  minutesLate: { type: Number, default: 0 },
  lateFee:     { type: Number, default: 0 },
  // Set only when a manager verifies the rider and starts the session —
  // this, not booking creation time, is what a live session timer counts
  // from. Charging never starts before this is set.
  chargingStartedAt: { type: Date, default: null },
}, { timestamps: true });

// Serves the "does this user already have an active booking?" check that
// runs on every single booking creation (routes/bookings.js POST /) —
// the single highest-frequency query against this collection.
BookingSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model("Booking", BookingSchema);