const mongoose = require("mongoose");

const ChargerSchema = new mongoose.Schema({
  id:     { type: Number },
  status: { type: String, enum: ["Available", "Reserved", "Charging", "Maintenance"], default: "Available" },
  type:   { type: String, default: "DC Fast" },
  power:  { type: Number, default: 50 },
});

const PeakPricingSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  // Two peak windows, matching real commute-driven EV demand: morning and
  // evening. Everything outside both windows is off-peak. These hours are
  // the one thing that legitimately varies station to station (a mall
  // charger and a highway charger have different rush hours) — so this
  // stays manager-editable. The MULTIPLIER and FEE amounts do not: those
  // are decided once, platform-wide, by admin (PlatformConfig) so pricing
  // strategy is consistent across every station on the network.
  morningStart: { type: Number, default: 8,  min: 0, max: 23 }, // 8 AM
  morningEnd:   { type: Number, default: 11, min: 0, max: 23 }, // 11 AM
  eveningStart: { type: Number, default: 18, min: 0, max: 23 }, // 6 PM
  eveningEnd:   { type: Number, default: 21, min: 0, max: 23 }, // 9 PM
}, { _id: false });

const StationSchema = new mongoose.Schema({
  name:          { type: String, required: true },
  // Optional — NOT required. A station's existence must not depend on
  // having an assigned manager: ChargeWay-owned stations may be run
  // centrally with no single manager, and when a manager account is
  // deleted (see routes/users.js) their stations are reassigned to
  // managerId: null rather than being destroyed. Previously this field
  // was `required: true` while deletion logic nulled it out — a direct
  // contradiction between the schema and the actual data it was storing.
  managerId:     { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  address:       { type: String, required: true },
  lat:           { type: Number, required: true },
  lng:           { type: Number, required: true },
  status:        { type: String, enum: ["Online", "Offline"], default: "Online", index: true },
  chargers:      [ChargerSchema],
  price_per_kwh: { type: Number, default: 18 },
  // "Owned" = ChargeWay-run stations, full platform pricing rules apply.
  // "Partner" = third-party chargers listed on the platform — the base
  // rate is still theirs, but the platform fee is uniform either way
  // (see PlatformConfig), and admin decides whether the prepaid/UPI
  // discount extends to partner stations.
  networkType:   { type: String, enum: ["Owned", "Partner"], default: "Owned" },
  // Partner onboarding gate (see beta_model.txt §47). A self-registered
  // Partner station starts "Pending" and Offline — it exists in the
  // database but is invisible to riders and cannot be booked until an
  // Admin reviews and approves it. Owned stations (created directly by
  // Admin via POST /stations) are approved immediately since Admin
  // creating the record IS the review. Never set directly by a Station
  // Manager — only auth.js (on signup) and the /approve, /reject routes
  // below write this field.
  approvalStatus:  { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Approved", index: true },
  businessName:    { type: String, default: null }, // partner's business/company name, shown to admin during review
  businessType:    { type: String, default: null }, // what kind of venue hosts this charger — e.g. Mall, Hotel, Highway Stop
  rejectionReason: { type: String, default: null },
  approvedBy:      { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  approvedAt:      { type: Date, default: null },
  facilities:    [String],
  image:         { type: String, default: null }, // legacy single cover image, kept for backward compat
  images:        { type: [String], default: [] }, // photo gallery — cover image is images[0] if present
  peakPricing:   { type: PeakPricingSchema, default: () => ({}) },
}, { timestamps: true });

// Plain compound index on lat/lng speeds up bounding-box style filtering
// (e.g. "stations within roughly this box") used by station discovery
// today. This is NOT a true geospatial index — lat/lng here are separate
// Number fields, not a GeoJSON Point, so Mongo's $near/$geoWithin operators
// aren't available until that's migrated to a `location: { type: "Point",
// coordinates: [lng, lat] }` field with a 2dsphere index. Flagged as a
// known limitation (see engineering notes) rather than silently faked.
StationSchema.index({ lat: 1, lng: 1 });

module.exports = mongoose.model("Station", StationSchema);
