const express  = require("express");
const Review   = require("../models/Review");
const Booking  = require("../models/Booking");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

// GET /api/reviews/:stationId — get all reviews for a station
router.get("/:stationId", async (req, res) => {
  try {
    const reviews = await Review.find({ stationId: req.params.stationId })
      .populate("userId", "name")
      .sort({ createdAt: -1 });

    const avg = reviews.length
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0;

    res.json({ reviews, averageRating: parseFloat(avg.toFixed(1)), totalReviews: reviews.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reviews/:stationId — submit a review (must have completed booking)
router.post("/:stationId", verifyToken, async (req, res) => {
  try {
    const { rating, comment } = req.body;

    // Must have a completed booking at this station
    const hasBooking = await Booking.findOne({
      userId:    req.user.id,
      stationId: req.params.stationId,
      status:    "Completed",
    });
    if (!hasBooking) {
      return res.status(403).json({ error: "You can only review stations you have visited" });
    }

    // Upsert — update if already reviewed
    const review = await Review.findOneAndUpdate(
      { userId: req.user.id, stationId: req.params.stationId },
      { rating, comment },
      { new: true, upsert: true }
    ).populate("userId", "name");

    res.status(201).json({ review });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/reviews/:stationId — delete own review
router.delete("/:stationId", verifyToken, async (req, res) => {
  try {
    await Review.findOneAndDelete({ userId: req.user.id, stationId: req.params.stationId });
    res.json({ message: "Review deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
