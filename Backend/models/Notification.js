const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  type:      { type: String, enum: ["booking_confirmed", "booking_cancelled", "charging_started", "session_complete", "refund_issued", "review_reply", "support_reply", "station_status", "partner_application_submitted", "partner_application_approved", "partner_application_rejected"], required: true },
  message:   { type: String, required: true },
  read:      { type: Boolean, default: false },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
}, { timestamps: true });

NotificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", NotificationSchema);
