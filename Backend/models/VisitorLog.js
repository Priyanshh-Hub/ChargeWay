const mongoose = require("mongoose");

const VisitorLogSchema = new mongoose.Schema({
  // A salted hash of IP+User-Agent, not the raw IP — enough to de-duplicate
  // "unique visitors" without the database holding an identifying value
  // that isn't otherwise needed anywhere in the app.
  visitorHash: { type: String, required: true, index: true },
  path:        { type: String, default: "/" },
  referrer:    { type: String, default: null },
}, { timestamps: true });

VisitorLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("VisitorLog", VisitorLogSchema);
