const express = require("express");
const Booking = require("../models/Booking");
const Station = require("../models/Station");
const { verifyToken, requireRole } = require("../middleware/auth");

const router = express.Router();

// ── Helper: generate next global invoice number ──────────────
async function generateInvoiceNo() {
  const year = new Date().getFullYear();
  // Count ALL completed bookings that have an invoiceNo this year
  const count = await Booking.countDocuments({
    invoiceNo: { $regex: `^CW-${year}-` }
  });
  return `CW-${year}-${String(count + 1).padStart(4, "0")}`;
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
router.post("/", verifyToken, async (req, res) => {
  try {
    const existing = await Booking.findOne({ userId: req.user.id, status: "Upcoming" });
    if (existing) return res.status(400).json({ error: "You already have an active booking" });

    const station = await Station.findById(req.body.stationId);
    if (!station) return res.status(404).json({ error: "Station not found" });
    if (station.status === "Offline") return res.status(400).json({ error: "This station is currently offline and not accepting bookings" });

    const charger = station.chargers.find(c => c.id === req.body.chargerId);
    if (!charger) return res.status(404).json({ error: "Charger not found" });
    if (charger.status !== "Available") return res.status(400).json({ error: `Charger #${req.body.chargerId} is currently ${charger.status}` });

    const booking = new Booking({ ...req.body, userId: req.user.id });
    await booking.save();

    await Station.findOneAndUpdate(
      { _id: req.body.stationId, "chargers.id": req.body.chargerId },
      { $set: { "chargers.$.status": "Charging" } }
    );

    res.status(201).json({ booking });
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
    await booking.save();
    await Station.findOneAndUpdate(
      { _id: booking.stationId, "chargers.id": booking.chargerId },
      { $set: { "chargers.$.status": "Available" } }
    );
    res.json({ booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/bookings/:id/complete
// When booking is marked complete → auto-assign a global invoice number
router.put("/:id/complete", verifyToken, requireRole("Admin", "Station Manager"), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    // Only assign invoiceNo if not already assigned
    if (!booking.invoiceNo) {
      booking.invoiceNo = await generateInvoiceNo();
    }
    booking.status = "Completed";
    await booking.save();

    await Station.findOneAndUpdate(
      { _id: booking.stationId, "chargers.id": booking.chargerId },
      { $set: { "chargers.$.status": "Available" } }
    );

    res.json({ booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;