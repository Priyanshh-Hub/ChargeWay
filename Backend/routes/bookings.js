const express = require("express");
const Booking = require("../models/Booking");
const Station = require("../models/Station");
const { verifyToken, requireRole } = require("../middleware/auth");
const { createNotification } = require("../utils/notify");
const { logAudit } = require("../utils/audit");
const { bookingLimiter } = require("../middleware/rateLimiter");
const { nextSequence } = require("../models/Counter");
const { getConfig } = require("../models/PlatformConfig");
const { getPricingContext, parseSlotDateTime } = require("../utils/pricing");

const router = express.Router();

// ── Helper: generate next global invoice number ──────────────

// Atomically reserves the next invoice number for this year — see
// models/Counter.js. Previously this counted existing invoices and added
// one, which two "complete booking" requests arriving at the same moment
// could both read before either had saved, producing duplicate invoice
// numbers. The atomic $inc counter makes that impossible.
async function generateInvoiceNo() {
  const year = new Date().getFullYear();
  const n = await nextSequence(`invoice_${year}`);
  return `CW-${year}-${String(n).padStart(4, "0")}`;
}

// GET /api/bookings/spending — MUST be before /:id routes
router.get("/spending", verifyToken, async (req, res) => {
  try {
    const now = new Date();
    const months = [], spending = [], energy = [];

    for (let i = 5; i >= 0; i--) {
      const d     = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
      const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0];
      months.push(d.toLocaleString("default", { month: "short" }));
      const bks = await Booking.find({ userId: req.user.id, status: "Completed", date: { $gte: start, $lte: end } });
      spending.push(parseFloat(bks.reduce((s, b) => s + (b.totalCost || 0), 0).toFixed(2)));
      energy.push(parseFloat(bks.reduce((s, b) => s + (b.energyKwh || 0), 0).toFixed(2)));
    }

    const allCompleted = await Booking.find({ userId: req.user.id, status: "Completed" });
    res.json({
      months, spending, energy,
      totals: {
        spent:    parseFloat(allCompleted.reduce((s, b) => s + (b.totalCost || 0), 0).toFixed(2)),
        energy:   parseFloat(allCompleted.reduce((s, b) => s + (b.energyKwh || 0), 0).toFixed(2)),
        sessions: allCompleted.length,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bookings
router.get("/", verifyToken, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === "User") query.userId = req.user.id;
    const bookings = await Booking.find(query)
      .populate("userId", "name email")
      .populate("stationId", "name address")
      .sort({ createdAt: -1 });
    res.json({ bookings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bookings
router.post("/", verifyToken, bookingLimiter, async (req, res) => {
  try {
    const existing = await Booking.findOne({ userId: req.user.id, status: "Upcoming" });
    if (existing) return res.status(400).json({ error: "You already have an active booking" });

    const station = await Station.findById(req.body.stationId);
    if (!station) return res.status(404).json({ error: "Station not found" });
    if (station.status === "Offline") return res.status(400).json({ error: "This station is currently offline and not accepting bookings" });
    // Defense-in-depth: status alone already keeps a Pending partner
    // application Offline (see auth.js), but check approvalStatus
    // explicitly too — nothing should be bookable that an Admin hasn't
    // actually approved, on principle, not just as a side effect of
    // another field's default.
    if (station.approvalStatus && station.approvalStatus !== "Approved") {
      return res.status(400).json({ error: "This station is not yet available for booking." });
    }

    const charger = station.chargers.find(c => c.id === req.body.chargerId);
    if (!charger) return res.status(404).json({ error: "Charger not found" });

    const paymentMethod = req.body.paymentMethod === "Cash" ? "Cash" : "UPI";

    // Energy requested is inherently self-reported in this beta/simulator
    // (no live vehicle telemetry) — but everything DERIVED from it (rate,
    // fee, discount, and therefore total cost) must be computed here, not
    // trusted from the client. Before this fix, the entire pricing object
    // (costPerKwh, platformFee, priceAdjustment, totalCost) came straight
    // from req.body — a client could request any energyKwh and simply
    // claim any totalCost it liked, and that number is what Razorpay would
    // later be told to charge (see routes/payments.js create-order, which
    // uses booking.totalCost as the amount).
    const energyKwh = Number(req.body.energyKwh);
    if (!Number.isFinite(energyKwh) || energyKwh <= 0 || energyKwh > 200) {
      return res.status(400).json({ error: "Energy requested must be a realistic amount between 0 and 200 kWh." });
    }

    const cfg = await getConfig();
    const ctx = getPricingContext(station, req.body.timeSlot, paymentMethod, cfg);
    const costPerKwh = ctx.pricePerKwh;
    const platformFee = ctx.platformFee;
    // getPricingContext returns the UPI discount as a per-kWh rate (scaled
    // by energy below) but the Cash surcharge as an already-flat amount —
    // see the comment on that function for why the two cases differ.
    const priceAdjustment = paymentMethod === "UPI"
      ? parseFloat((ctx.priceAdjustment * energyKwh).toFixed(2))
      : ctx.priceAdjustment;
    const totalCost = parseFloat((energyKwh * costPerKwh + platformFee + priceAdjustment).toFixed(2));

    // Revenue split, snapshotted now — see models/Booking.js for why this
    // isn't recomputed later from (possibly since-changed) config.
    const networkTypeAtBooking = station.networkType;
    let partnerCommission = 0, partnerPayout = 0;
    if (networkTypeAtBooking === "Partner") {
      const energyRevenue = parseFloat((energyKwh * costPerKwh).toFixed(2));
      partnerCommission = parseFloat((energyRevenue * cfg.partnerCommissionPct).toFixed(2));
      partnerPayout = parseFloat((energyRevenue - partnerCommission).toFixed(2));
    }

    // Atomically claim the charger as RESERVED — not charging yet. Charging
    // only actually starts once a manager verifies the rider showed up
    // (see PUT /verify-checkin below). Only succeeds if the charger is
    // still "Available" at the moment of the write, closing the race where
    // two people who both read "Available" a moment apart could otherwise
    // both book the same charger.
    const claimed = await Station.findOneAndUpdate(
      { _id: req.body.stationId, "chargers.id": req.body.chargerId, "chargers.status": "Available" },
      { $set: { "chargers.$.status": "Reserved" } }
    );
    if (!claimed) return res.status(409).json({ error: `Charger #${req.body.chargerId} was just booked by someone else. Please pick another.` });

    // Uber/Rapido-style 4-digit check-in PIN — read aloud or typed in by
    // station staff to confirm the rider actually showed up.
    const checkInOtp = String(Math.floor(1000 + Math.random() * 9000));

    let booking;
    try {
      booking = new Booking({
        stationId: req.body.stationId,
        stationName: station.name,
        chargerId: req.body.chargerId,
        vehicleNumber: req.body.vehicleNumber,
        timeSlot: req.body.timeSlot,
        date: req.body.date,
        duration: req.body.duration,
        userId: req.user.id,
        paymentMethod, checkInOtp,
        energyKwh, costPerKwh, platformFee, priceAdjustment, totalCost,
        networkTypeAtBooking, partnerCommission, partnerPayout,
      });
      await booking.save();
    } catch (bookingErr) {
      // Booking failed after we claimed the charger — release it so it
      // doesn't get stuck "Charging" with nothing actually booked.
      await Station.findOneAndUpdate(
        { _id: req.body.stationId, "chargers.id": req.body.chargerId },
        { $set: { "chargers.$.status": "Available" } }
      );
      throw bookingErr;
    }

    await createNotification(req.user.id, "booking_confirmed",
      `Your charging slot at ${station.name} is confirmed for ${booking.timeSlot}. Check-in code: ${checkInOtp}.`, booking._id);

    res.status(201).json({ booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/bookings/verify-checkin — Station Manager/Admin confirms a
// rider has actually arrived, using either the 4-digit code the rider
// reads out (Uber/Rapido-style) or the booking id encoded in their QR
// (scanned or pasted). Either identifies the same booking.
// PUT /api/bookings/verify-checkin — Station Manager/Admin confirms a
// rider has actually arrived (via the 4-digit PIN they read out) AND
// starts the charging session in the same action — matching how this
// works in person: the moment staff confirm you're at the right charger,
// plugging in and starting is the same motion, not two separate steps.
router.put("/verify-checkin", verifyToken, requireRole("Admin", "Station Manager"), async (req, res) => {
  try {
    const { otp, bookingId } = req.body;
    if (!otp && !bookingId) return res.status(400).json({ error: "Provide a check-in code." });

    const query = { status: "Upcoming", checkedIn: false };
    if (bookingId) query._id = bookingId;
    else query.checkInOtp = String(otp).trim();

    const booking = await Booking.findOne(query).populate("stationId", "name managerId");
    if (!booking) return res.status(404).json({ error: "No matching upcoming booking found. Check the code and try again." });

    if (req.user.role === "Station Manager" && String(booking.stationId?.managerId) !== String(req.user.id)) {
      return res.status(403).json({ error: "This booking isn't for your station." });
    }

    const now = new Date();
    booking.checkedIn = true;
    booking.checkedInAt = now;
    booking.chargingStartedAt = now;

    // Late arrival fee — a booking claims a specific charger for a
    // specific slot; showing up late means that charger sat reserved and
    // idle when someone else could've used it. Grace period first, then
    // a nominal per-minute fine, computed once here and folded into the
    // final total — never recomputed later from (possibly since-changed)
    // config, same principle as every other pricing field on this model.
    const slotStart = parseSlotDateTime(booking.date, booking.timeSlot);
    if (slotStart) {
      const cfg = await getConfig();
      const minutesLate = Math.max(0, Math.floor((now - slotStart) / 60000) - cfg.lateGraceMinutes);
      if (minutesLate > 0) {
        booking.minutesLate = minutesLate;
        booking.lateFee = Math.round(minutesLate * cfg.lateFeePerMinute);
        booking.totalCost = parseFloat((booking.totalCost + booking.lateFee).toFixed(2));
      }
    }

    await booking.save();

    // Charger moves from Reserved to actually Charging only now.
    await Station.findOneAndUpdate(
      { _id: booking.stationId, "chargers.id": booking.chargerId },
      { $set: { "chargers.$.status": "Charging" } }
    );

    const lateNote = booking.lateFee > 0 ? ` A late fee of ₹${booking.lateFee} (${booking.minutesLate} min past your slot) has been added to your total.` : "";
    await createNotification(booking.userId, "charging_started",
      `You're checked in at ${booking.stationId?.name || booking.stationName} — charging has started.${lateNote}`, booking._id);

    res.json({ booking, message: `Verified — charging started for ${booking.vehicleNumber || "rider"} at charger #${booking.chargerId}.${lateNote}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/bookings/:id/cancel
router.put("/:id/cancel", verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, userId: req.user.id });
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    booking.status = "Cancelled";

    // Refund a completed payment via Razorpay before releasing the charger.
    // Refund failures never block the cancellation itself — the booking
    // still needs to be cancelled and the charger freed either way; a
    // failed refund is logged for support to follow up on manually.
    let refundIssued = false;
    if (booking.paymentStatus === "paid") {
      try {
        const Transaction = require("../models/Transaction");
        const origTxn = await Transaction.findOne({ bookingId: booking._id, type: "booking_payment", status: "success" }).sort({ createdAt: -1 });
        const keyId = process.env.RAZORPAY_KEY_ID, keySecret = process.env.RAZORPAY_KEY_SECRET;
        if (origTxn?.razorpayPaymentId && keyId && keySecret) {
          const Razorpay = require("razorpay");
          const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
          await razorpay.payments.refund(origTxn.razorpayPaymentId, { amount: Math.round(booking.totalCost * 100) });
          await Transaction.create({
            userId: req.user.id, type: "refund", amount: booking.totalCost, status: "success",
            razorpayPaymentId: origTxn.razorpayPaymentId, bookingId: booking._id,
            note: `Refund for cancelled booking at ${booking.stationName || "station"}`,
          });
          booking.paymentStatus = "refunded";
          refundIssued = true;
        }
      } catch (refundErr) {
        require("../utils/logger").error({ refundErr }, "Refund failed for cancelled booking");
      }
    }

    await booking.save();
    await Station.findOneAndUpdate(
      { _id: booking.stationId, "chargers.id": booking.chargerId },
      { $set: { "chargers.$.status": "Available" } }
    );

    await createNotification(req.user.id, "booking_cancelled",
      refundIssued
        ? `Your booking at ${booking.stationName} was cancelled and ₹${booking.totalCost} was refunded.`
        : `Your booking at ${booking.stationName} was cancelled.`,
      booking._id);

    res.json({ booking, refundIssued });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/bookings/:id/complete
// When booking is marked complete → auto-assign a global invoice number,
// and actually apply the charge to the rider's saved vehicle battery
// level (previously the booking recorded a target battery %, but nothing
// ever wrote it back to the vehicle — so the dashboard's battery gauge
// never reflected a completed charge).
router.put("/:id/complete", verifyToken, requireRole("Admin", "Station Manager"), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    // Only assign invoiceNo if not already assigned
    if (!booking.invoiceNo) {
      booking.invoiceNo = await generateInvoiceNo();
    }
    booking.status = "Completed";

    // Cash bookings are unpaid until the rider actually pays at the
    // station — completing the session is the natural point that happens,
    // so record the cash collection here rather than requiring a separate
    // manual step.
    let cashCollected = false;
    if (booking.paymentMethod === "Cash" && booking.paymentStatus !== "paid") {
      booking.paymentStatus = "paid";
      cashCollected = true;
    }
    await booking.save();

    if (cashCollected) {
      const Transaction = require("../models/Transaction");
      await Transaction.create({
        userId: booking.userId, type: "booking_payment", amount: booking.totalCost, status: "success",
        paymentMethod: "Cash", bookingId: booking._id,
        note: `Cash collected at ${booking.stationName || "station"}`,
      });
    }

    await Station.findOneAndUpdate(
      { _id: booking.stationId, "chargers.id": booking.chargerId },
      { $set: { "chargers.$.status": "Available" } }
    );

    // Apply the charge to the rider's vehicle battery level — update both
    // the primary `car` (if it's the one that was charged) and the matching
    // entry in the `cars` list, since both are kept in sync elsewhere.
    if (booking.targetBattery != null) {
      const User = require("../models/User");
      const user = await User.findById(booking.userId);
      if (user) {
        if (user.car && (user.car.vehicleNumber === booking.vehicleNumber || !booking.vehicleNumber)) {
          user.car.battery = booking.targetBattery;
        }
        const carInList = user.cars?.find(v => v.vehicleNumber === booking.vehicleNumber);
        if (carInList) carInList.battery = booking.targetBattery;
        await user.save();
      }
    }

    await createNotification(booking.userId, "session_complete",
      `Your charging session at ${booking.stationName} is complete. Battery is now ${booking.targetBattery ?? "—"}%.`,
      booking._id);
    await logAudit({ actor: req.user, action: "booking.complete", targetType: "Booking", targetId: booking._id, details: `Completed booking at ${booking.stationName}` });

    res.json({ booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;