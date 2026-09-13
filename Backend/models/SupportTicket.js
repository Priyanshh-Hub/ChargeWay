const mongoose = require("mongoose");

const SupportTicketSchema = new mongoose.Schema({
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  subject: { type: String, required: true, trim: true, maxlength: 150 },
  message: { type: String, required: true, trim: true, maxlength: 2000 },
  status:  { type: String, enum: ["open", "closed"], default: "open", index: true },
}, { timestamps: true });

module.exports = mongoose.model("SupportTicket", SupportTicketSchema);
