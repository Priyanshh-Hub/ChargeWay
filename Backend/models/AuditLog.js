const mongoose = require("mongoose");

const AuditLogSchema = new mongoose.Schema({
  actorId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  actorName:  { type: String, required: true }, // denormalized so logs survive if the actor is later deleted
  actorRole:  { type: String, required: true },
  action:     { type: String, required: true }, // e.g. "user.suspend", "user.delete", "station.status_change", "booking.refund"
  targetType: { type: String },                 // "User" | "Station" | "Booking" | "Review" | "SupportTicket"
  targetId:   { type: mongoose.Schema.Types.ObjectId },
  details:    { type: String },                 // short human-readable summary
}, { timestamps: true });

AuditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("AuditLog", AuditLogSchema);
