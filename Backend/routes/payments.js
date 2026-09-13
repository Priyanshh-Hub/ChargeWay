const express = require("express");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const User = require("../models/User");
const Booking = require("../models/Booking");
const Transaction = require("../models/Transaction");
const PaymentOrder = require("../models/PaymentOrder");
const { verifyToken } = require("../middleware/auth");
const logger = require("../utils/logger");

const router = express.Router();

const MIN_TOPUP = 10;      // ₹10
const MAX_TOPUP = 50000;   // ₹50,000 — reasonable ceiling to limit abuse

// Lazily construct the Razorpay client so a missing key doesn't crash the
// whole server at boot — it just makes payment routes return a clear error
// until RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are set in .env.
function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

// POST /api/payments/create-order
// purpose: "wallet_topup" (default) or "booking" — pass bookingId for the latter.
router.post("/create-order", verifyToken, async (req, res) => {
  try {
    const razorpay = getRazorpayClient();
    if (!razorpay) {
      return res.status(503).json({
        error: "Payments aren't configured yet. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to the backend .env (free test-mode keys from your Razorpay dashboard).",
        code: "PAYMENTS_NOT_CONFIGURED",
      });
    }

    const purpose = req.body.purpose === "booking" ? "booking" : "wallet_topup";
    let amount = Number(req.body.amount);
    let booking = null;

    if (purpose === "booking") {
      booking = await Booking.findOne({ _id: req.body.bookingId, userId: req.user.id });
      if (!booking) return res.status(404).json({ error: "Booking not found." });
      if (booking.paymentStatus === "paid") return res.status(400).json({ error: "This booking is already paid." });
      amount = booking.totalCost; // trust the server-computed cost, not the client
      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ error: "This booking has no payable amount yet." });
      }
    } else {
      if (!Number.isFinite(amount) || amount < MIN_TOPUP || amount > MAX_TOPUP) {
        return res.status(400).json({ error: `Amount must be between ₹${MIN_TOPUP} and ₹${MAX_TOPUP}.` });
      }
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Razorpay works in paise
      currency: "INR",
      receipt: `${purpose}_${req.user.id}_${Date.now()}`,
      notes: { userId: req.user.id, purpose, bookingId: booking?._id?.toString() || "" },
    });

    // Persist the server-computed amount now, keyed by this order — /verify
    // reads it back from here rather than trusting whatever amount the
    // client sends later. See models/PaymentOrder.js for why that matters.
    await PaymentOrder.create({
      razorpayOrderId: order.id,
      userId: req.user.id,
      purpose,
      bookingId: booking?._id || null,
      amount,
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      purpose,
      bookingId: booking?._id || null,
    });
  } catch (err) {
    logger.error({ err }, "Razorpay create-order error");
    res.status(500).json({ error: "Could not start payment. Please try again." });
  }
});

// POST /api/payments/verify — confirm signature, then credit wallet OR mark a booking paid
router.post("/verify", verifyToken, async (req, res) => {
  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return res.status(503).json({ error: "Payments aren't configured yet.", code: "PAYMENTS_NOT_CONFIGURED" });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: "Missing payment details." });
    }

    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: "Payment verification failed. If money was deducted, contact support with your payment ID." });
    }

    // The order record made in /create-order is the only source of truth
    // for what this payment is *for* and how much it's worth — never the
    // client's own request body. Razorpay's signature covers order_id and
    // payment_id only, not amount, so trusting a client-supplied amount
    // here would let anyone pay for a ₹10 order and claim any amount they
    // like. See models/PaymentOrder.js.
    const order = await PaymentOrder.findOne({ razorpayOrderId: razorpay_order_id });
    if (!order) {
      return res.status(404).json({ error: "We don't recognize this order. Please start the payment again.", code: "ORDER_NOT_FOUND" });
    }
    if (String(order.userId) !== String(req.user.id)) {
      return res.status(403).json({ error: "This order does not belong to your account." });
    }

    // Idempotency: if this order was already consumed (a retried request,
    // a duplicated webhook, a double-click), don't credit/mark-paid a
    // second time. Return the same success shape so a legitimate retry
    // from the frontend still looks like success rather than an error.
    if (order.status === "consumed") {
      if (order.purpose === "booking") {
        const booking = await Booking.findById(order.bookingId);
        return res.json({ message: "Payment already verified. Booking marked as paid.", booking, alreadyProcessed: true });
      }
      const user = await User.findById(req.user.id);
      return res.json({ message: "Payment already verified. Wallet updated.", user: user?.toSafeJSON(), alreadyProcessed: true });
    }

    // Atomically flip created -> consumed. If two requests race here (e.g.
    // the frontend retries while the first call is still in flight), only
    // one findOneAndUpdate can match `status: "created"` — the loser gets
    // `claimed === null` and falls back to the already-processed path
    // above once the winner finishes, rather than double-crediting.
    const claimed = await PaymentOrder.claim(razorpay_order_id, razorpay_payment_id);
    if (!claimed) {
      const fresh = await PaymentOrder.findOne({ razorpayOrderId: razorpay_order_id });
      if (fresh?.purpose === "booking") {
        const booking = await Booking.findById(fresh.bookingId);
        return res.json({ message: "Payment already verified. Booking marked as paid.", booking, alreadyProcessed: true });
      }
      const user = await User.findById(req.user.id);
      return res.json({ message: "Payment already verified. Wallet updated.", user: user?.toSafeJSON(), alreadyProcessed: true });
    }

    if (order.purpose === "booking") {
      const booking = await Booking.findOne({ _id: order.bookingId, userId: req.user.id });
      if (!booking) return res.status(404).json({ error: "Booking not found." });

      booking.paymentStatus = "paid";
      booking.paymentMethod = "Razorpay";
      await booking.save();

      await Transaction.create({
        userId: req.user.id,
        type: "booking_payment",
        amount: order.amount,
        status: "success",
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        bookingId: booking._id,
        note: `Payment for booking at ${booking.stationName || "station"}`,
      });

      return res.json({ message: "Payment verified. Booking marked as paid.", booking });
    }

    // Default: wallet top-up.
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $inc: { walletBalance: order.amount } },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: "User not found" });

    await Transaction.create({
      userId: req.user.id,
      type: "wallet_topup",
      amount: order.amount,
      status: "success",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      balanceAfter: user.walletBalance,
      note: "Wallet top-up",
    });

    res.json({ message: "Payment verified. Wallet updated.", user: user.toSafeJSON() });
  } catch (err) {
    // A duplicate-key error here means the Transaction-level unique index
    // (razorpayPaymentId) caught a double-write that slipped past the
    // PaymentOrder claim above — treat it the same as "already processed"
    // rather than surfacing a raw Mongo error to the client.
    if (err?.code === 11000) {
      logger.warn({ err }, "Duplicate payment verification caught at DB level");
      return res.json({ message: "Payment already verified.", alreadyProcessed: true });
    }
    logger.error({ err }, "Razorpay verify error");
    res.status(500).json({ error: "Could not verify payment. Please contact support." });
  }
});

// GET /api/payments/transactions — persisted wallet & booking payment history
router.get("/transactions", verifyToken, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const transactions = await Transaction.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("bookingId", "stationName date timeSlot");
    res.json({ transactions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
