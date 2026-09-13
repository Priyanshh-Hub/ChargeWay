const express = require("express");
const { getConfig, setConfig } = require("../models/PlatformConfig");
const { verifyToken, requireRole } = require("../middleware/auth");
const { logAudit } = require("../utils/audit");

const router = express.Router();

// GET /api/platform-config/partner-terms — PUBLIC, no auth. A prospective
// partner filling out the registration form (routes/auth.js) isn't logged
// in yet and has no way to see the full config below — but they
// reasonably want to know ChargeWay's cut before applying. Exposes only
// the one number that matters for that decision, not the rest of the
// platform's internal pricing levers.
router.get("/partner-terms", async (req, res) => {
  try {
    const config = await getConfig();
    res.json({ partnerCommissionPct: config.partnerCommissionPct });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/platform-config — any logged-in user (needed to compute/display
// pricing on booking, dashboard, station browsing screens).
router.get("/", verifyToken, async (req, res) => {
  try {
    const config = await getConfig();
    res.json({ config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/platform-config — Admin only
router.put("/", verifyToken, requireRole("Admin"), async (req, res) => {
  try {
    const allowed = [
      "platformFeePeak", "platformFeeOffPeak",
      "peakMultiplier", "offPeakMultiplier",
      "upiDiscountPct", "cashSurcharge", "applyDiscountToPartners",
      "partnerCommissionPct", "lateGraceMinutes", "lateFeePerMinute",
    ];
    const updates = {};
    for (const key of allowed) if (req.body[key] !== undefined) updates[key] = req.body[key];

    const config = await setConfig(updates);
    await logAudit({ actor: req.user, action: "platform_config.update", targetType: "PlatformConfig", details: "Updated platform-wide pricing config" });
    res.json({ config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
