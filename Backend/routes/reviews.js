const express  = require("express");
const Review   = require("../models/Review");
const Booking  = require("../models/Booking");
const Station  = require("../models/Station");
const { verifyToken, requireRole } = require("../middleware/auth");
const { createNotification } = require("../utils/notify");
const { reviewLimiter } = require("../middleware/rateLimiter");

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
router.post("/:stationId", verifyToken, reviewLimiter, async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const numRating = Number(rating);
    if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ error: "Rating must be a whole number between 1 and 5." });
    }
    const cleanComment = typeof comment === "string" ? comment.trim().slice(0, 1000) : "";

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
      { rating: numRating, comment: cleanComment },
      { new: true, upsert: true }
    ).populate("userId", "name");

    res.status(201).json({ review });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/reviews/:reviewId/reply — Station Manager (of that station) or Admin responds
router.put("/:reviewId/reply", verifyToken, requireRole("Station Manager", "Admin"), async (req, res) => {
  try {
    const text = typeof req.body.text === "string" ? req.body.text.trim().slice(0, 500) : "";
    if (!text) return res.status(400).json({ error: "Reply text is required." });

    const review = await Review.findById(req.params.reviewId);
    if (!review) return res.status(404).json({ error: "Review not found." });

    if (req.user.role === "Station Manager") {
      const station = await Station.findById(review.stationId);
      if (!station || String(station.managerId) !== String(req.user.id)) {
        return res.status(403).json({ error: "You can only reply to reviews on your own station." });
      }
    }

    review.ownerReply = { text, repliedBy: req.user.id, repliedAt: new Date() };
    await review.save();

    const station = await Station.findById(review.stationId).select("name");
    await createNotification(review.userId, "review_reply",
      `${station?.name || "A station"} replied to your review.`);

    res.json({ review });
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
