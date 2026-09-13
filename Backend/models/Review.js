const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  stationId: { type: mongoose.Schema.Types.ObjectId, ref: "Station", required: true },
  rating:    { type: Number, required: true, min: 1, max: 5 },
  comment:   { type: String, trim: true, maxlength: 500 },

  // Station manager / admin response to this review.
  ownerReply: {
    text:       { type: String, trim: true, maxlength: 500 },
    repliedBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    repliedAt:  { type: Date },
  },
}, { timestamps: true });

// One review per user per station
ReviewSchema.index({ userId: 1, stationId: 1 }, { unique: true });

module.exports = mongoose.model("Review", ReviewSchema);
