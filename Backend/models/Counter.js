const mongoose = require("mongoose");

const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. "invoice_2026"
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model("Counter", CounterSchema);

// Atomically returns the next number in a named sequence. Two requests
// hitting this at the same instant cannot receive the same value —
// $inc on a single document is atomic at the MongoDB storage layer,
// unlike the previous "count existing docs, add 1, save" pattern which
// had a read-then-write gap two concurrent requests could both land in.
async function nextSequence(key) {
  const counter = await Counter.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return counter.seq;
}

module.exports = { Counter, nextSequence };
