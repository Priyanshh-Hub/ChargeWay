const mongoose = require("mongoose");

const ChargerSchema = new mongoose.Schema({
  id:     { type: Number },
  status: { type: String, enum: ["Available", "Charging", "Maintenance"], default: "Available" },
  type:   { type: String, default: "DC Fast" },
  power:  { type: Number, default: 50 },
});

const StationSchema = new mongoose.Schema({
  name:          { type: String, required: true },
  managerId:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  address:       { type: String, required: true },
  lat:           { type: Number, required: true },
  lng:           { type: Number, required: true },
  status:        { type: String, enum: ["Online", "Offline"], default: "Online" },
  chargers:      [ChargerSchema],
  price_per_kwh: { type: Number, default: 18 },
  facilities:    [String],
  image:         { type: String, default: null },
}, { timestamps: true });

module.exports = mongoose.model("Station", StationSchema);
