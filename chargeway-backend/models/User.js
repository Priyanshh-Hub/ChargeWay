const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const CarSchema = new mongoose.Schema({
  brand:         { type: String },
  model:         { type: String },
  image:         { type: String },
  battery_kwh:   { type: Number },
  range_km:      { type: Number },
  color:         { type: String },
  efficiency:    { type: Number },
  vehicleNumber: { type: String },
  battery:       { type: Number, default: 85 },
});

const UserSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone:    { type: String },
  password: { type: String, required: true },
  role:     { type: String, enum: ["User", "Station Manager", "Admin"], default: "User" },
  car:      { type: CarSchema, default: null },
  joinDate: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
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
  return obj;
};

module.exports = mongoose.model("User", UserSchema);
