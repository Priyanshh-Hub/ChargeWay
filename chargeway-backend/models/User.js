const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const CarSchema = new mongoose.Schema({
  brand:         { type: String },
  model:         { type: String },
  nickname:      { type: String, trim: true },
  image:         { type: String },
  battery_kwh:   { type: Number },
  range_km:      { type: Number },
  color:         { type: String },
  efficiency:    { type: Number },
  vehicleNumber: { type: String },
  battery:       { type: Number, default: 85 },      // current charge %
  batteryHealth: { type: Number, default: 100 },      // battery SOH %
  connectorType: { type: String, default: "CCS2" },   // CCS2 | Type2 | CHAdeMO | GB/T
  isFavorite:    { type: Boolean, default: false },
  addedAt:       { type: Date, default: Date.now },
});

const UserSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone:    { type: String },
  password: { type: String, required: true },
  role:     { type: String, enum: ["User", "Station Manager", "Admin"], default: "User" },

  // Primary/favorite vehicle — kept in sync with `cars` for backward
  // compatibility with screens that only read a single active vehicle.
  car:      { type: CarSchema, default: null },
  cars:     { type: [CarSchema], default: [] },

  joinDate: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },

  // ── Email verification (simulated — no SMTP wired up yet) ──
  isVerified:          { type: Boolean, default: false },
  verifyToken:         { type: String, default: null },
  verifyTokenExpires:  { type: Date, default: null },

  // ── Password reset ──
  resetToken:          { type: String, default: null },
  resetTokenExpires:   { type: Date, default: null },

  // ── Session / security ──
  rememberMe:          { type: Boolean, default: false },

  // ── Favorites ──
  favoriteStations:    [{ type: mongoose.Schema.Types.ObjectId, ref: "Station" }],

  // ── Preferences ──
  preferences: {
    emailNotifications: { type: Boolean, default: true },
    smsNotifications:   { type: Boolean, default: false },
    promotions:         { type: Boolean, default: true },
  },
}, { timestamps: true });

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

UserSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

UserSchema.methods.toSafeJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.verifyToken;
  delete obj.resetToken;
  delete obj.resetTokenExpires;
  return obj;
};

// Keep the legacy `car` field pointed at whichever vehicle is favorited
// (or the most recently added one if none is favorited yet).
UserSchema.methods.syncPrimaryCar = function () {
  if (!this.cars || this.cars.length === 0) {
    this.car = null;
    return;
  }
  const favorite = this.cars.find(c => c.isFavorite);
  this.car = favorite || this.cars[this.cars.length - 1];
};

module.exports = mongoose.model("User", UserSchema);
