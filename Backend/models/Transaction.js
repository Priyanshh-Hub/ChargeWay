const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  type:     { type: String, enum: ["wallet_topup", "booking_payment", "refund"], required: true },
  amount:   { type: Number, required: true }, // in ₹ (rupees), always positive
  status:   { type: String, enum: ["success", "failed"], default: "success" },
  paymentMethod: { type: String, enum: ["UPI", "Cash"], default: "UPI" },

  // Razorpay identifiers, kept for support/reconciliation. Unique+sparse so
  // the database itself refuses a second Transaction for the same
  // razorpayPaymentId — a hard backstop under the application-level
  // idempotency check in routes/payments.js, in case that check is ever
  // bypassed (e.g. a future direct DB script or a race we didn't foresee).
  razorpayOrderId:   { type: String },
  razorpayPaymentId: { type: String, unique: true, sparse: true },

  // Present only for type === "booking_payment".
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },

  // Wallet balance immediately after this transaction, so the history
  // reads like a real bank statement without recomputing on every view.
  balanceAfter: { type: Number },

  note: { type: String },
}, { timestamps: true });

TransactionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Transaction", TransactionSchema);
