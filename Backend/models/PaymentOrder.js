const mongoose = require("mongoose");

// Bridges create-order → verify. Two things this closes that the previous
// implementation left open (see routes/payments.js history):
//
// 1. AMOUNT TRUST: Razorpay's signature only covers
//    `${razorpay_order_id}|${razorpay_payment_id}` — it does NOT cover the
//    amount. The old /verify handler credited `req.body.amount` directly,
//    so a client could pay for a ₹10 order and claim `amount: 50000` in
//    the verify request and still pass signature verification. Persisting
//    the server-computed amount at order-creation time and using *that*
//    value in /verify (never req.body.amount) removes the client from the
//    trust boundary entirely.
//
// 2. IDEMPOTENCY / DOUBLE-PROCESSING: a double-click, network retry, or a
//    resubmitted webhook could hit /verify twice for the same order. The
//    atomic status flip in markConsumed (status: "created" -> "consumed")
//    guarantees only one of two simultaneous requests can "win" and
//    perform the wallet credit / booking-paid transition — the same
//    findOneAndUpdate-based pattern already used for invoice numbers in
//    models/Counter.js.
const PaymentOrderSchema = new mongoose.Schema({
  razorpayOrderId: { type: String, required: true, unique: true, index: true },
  userId:          { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  purpose:         { type: String, enum: ["wallet_topup", "booking"], required: true },
  bookingId:       { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
  // Rupees — the exact amount the order was created for server-side.
  // This, not any client-supplied figure, is what /verify credits.
  amount:          { type: Number, required: true },
  status:          { type: String, enum: ["created", "consumed"], default: "created" },
  razorpayPaymentId: { type: String, default: null }, // set once consumed
}, { timestamps: true });

// Atomically claims this order for processing. Returns the updated
// document if this call won the race, or null if the order was already
// consumed (by a prior call or a concurrent one) or doesn't exist.
PaymentOrderSchema.statics.claim = function (razorpayOrderId, razorpayPaymentId) {
  return this.findOneAndUpdate(
    { razorpayOrderId, status: "created" },
    { status: "consumed", razorpayPaymentId },
    { new: true }
  );
};

module.exports = mongoose.model("PaymentOrder", PaymentOrderSchema);
