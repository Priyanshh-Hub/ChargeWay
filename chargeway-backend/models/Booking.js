const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema({
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  stationId:     { type: mongoose.Schema.Types.ObjectId, ref: "Station", required: true },
  stationName:   { type: String },
  chargerId:     { type: Number },
  vehicleNumber: { type: String },
  timeSlot:      { type: String },
  date:          { type: String },
  duration:      { type: Number },
  energyKwh:     { type: Number },
  costPerKwh:    { type: Number },
  platformFee:   { type: Number, default: 30 },
  totalCost:     { type: Number },
  status:        { type: String, enum: ["Upcoming", "Completed", "Cancelled"], default: "Upcoming" },
  paymentMethod: { type: String, default: "UPI" },
  invoiceNo:     { type: String, default: null }, // ← global sequential e.g. CW-2026-0001
}, { timestamps: true });

module.exports = mongoose.model("Booking", BookingSchema);