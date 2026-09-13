const express = require("express");
const SupportTicket = require("../models/SupportTicket");
const { verifyToken, requireRole } = require("../middleware/auth");
const { createNotification } = require("../utils/notify");
const email = require("../utils/email");
const logger = require("../utils/logger");

const router = express.Router();

// POST /api/support — submit a ticket, emails a confirmation if SMTP is configured
router.post("/", verifyToken, async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject?.trim() || !message?.trim()) {
      return res.status(400).json({ error: "Subject and message are required." });
    }

    const ticket = await SupportTicket.create({
      userId: req.user.id,
      subject: subject.trim(),
      message: message.trim(),
    });

    // Best-effort confirmation email — never blocks the response on failure.
    try {
      if (email.isConfigured()) {
        const User = require("../models/User");
        const user = await User.findById(req.user.id);
        if (user) {
          await email.sendMail?.({
            to: user.email,
            subject: `We've got your message — ${subject.trim()}`,
            html: `<p>Hi ${user.name}, thanks for reaching out. Our team will get back to you at this email address soon.</p><p><strong>Your message:</strong><br/>${message.trim()}</p>`,
          });
        }
      }
    } catch (e) {
      logger.warn({ e }, "Support confirmation email failed (non-blocking)");
    }

    res.status(201).json({ ticket });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/support/mine — a user's own ticket history
router.get("/mine", verifyToken, async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ tickets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/support — Admin only: every ticket, across all users
router.get("/", verifyToken, requireRole("Admin"), async (req, res) => {
  try {
    const tickets = await SupportTicket.find()
      .populate("userId", "name email")
      .sort({ status: 1, createdAt: -1 }); // open tickets first
    res.json({ tickets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/support/:id/status — Admin only: open/close a ticket
router.put("/:id/status", verifyToken, requireRole("Admin"), async (req, res) => {
  try {
    const status = req.body.status === "closed" ? "closed" : "open";
    const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    if (status === "closed") {
      await createNotification(ticket.userId, "support_reply", `Your support ticket "${ticket.subject}" has been resolved.`);
    }
    res.json({ ticket });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
