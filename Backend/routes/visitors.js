const express = require("express");
const crypto = require("crypto");
const VisitorLog = require("../models/VisitorLog");
const { verifyToken, requireRole } = require("../middleware/auth");

const router = express.Router();

// Salt so the hash can't be reversed to the original IP even if the DB
// were ever exposed — set VISITOR_HASH_SALT in .env for production; falls
// back to a fixed dev value so this never crashes for lack of config.
const SALT = process.env.VISITOR_HASH_SALT || "chargeway_dev_salt_change_in_production";

function hashVisitor(req) {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  const ua = req.headers["user-agent"] || "unknown";
  return crypto.createHash("sha256").update(`${SALT}:${ip}:${ua}`).digest("hex");
}

// POST /api/visitors/track — public, no auth (fired from the landing page
// on load). Deliberately lightweight: never blocks or fails loudly, since
// a tracking hiccup should never be visible to a real visitor.
router.post("/track", async (req, res) => {
  try {
    const visitorHash = hashVisitor(req);
    await VisitorLog.create({
      visitorHash,
      path: typeof req.body?.path === "string" ? req.body.path.slice(0, 200) : "/",
      referrer: typeof req.body?.referrer === "string" ? req.body.referrer.slice(0, 200) : null,
    });
    res.status(201).json({ ok: true });
  } catch (err) {
    // Never surface tracking failures to the visitor.
    res.status(200).json({ ok: false });
  }
});

// GET /api/visitors/stats — Admin only
router.get("/stats", verifyToken, requireRole("Admin"), async (req, res) => {
  try {
    const now = new Date();
    const dayAgo   = new Date(now - 24 * 60 * 60 * 1000);
    const weekAgo  = new Date(now - 7  * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [totalVisits, last24h, last7d, last30d, uniqueLast30d] = await Promise.all([
      VisitorLog.countDocuments(),
      VisitorLog.countDocuments({ createdAt: { $gte: dayAgo } }),
      VisitorLog.countDocuments({ createdAt: { $gte: weekAgo } }),
      VisitorLog.countDocuments({ createdAt: { $gte: monthAgo } }),
      VisitorLog.distinct("visitorHash", { createdAt: { $gte: monthAgo } }),
    ]);

    // Daily trend for the last 14 days — real counts, grouped server-side.
    const trend = await VisitorLog.aggregate([
      { $match: { createdAt: { $gte: new Date(now - 14 * 24 * 60 * 60 * 1000) } } },
      { $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          visits: { $sum: 1 },
          uniqueVisitors: { $addToSet: "$visitorHash" },
        } },
      { $project: { date: "$_id", visits: 1, uniqueCount: { $size: "$uniqueVisitors" }, _id: 0 } },
      { $sort: { date: 1 } },
    ]);

    res.json({
      totalVisits, last24h, last7d, last30d,
      uniqueVisitors30d: uniqueLast30d.length,
      trend,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
