const express = require("express");
const Station = require("../models/Station");
const Booking = require("../models/Booking");
const User    = require("../models/User");
const { verifyToken, requireRole, optionalAuth } = require("../middleware/auth");
const { logAudit } = require("../utils/audit");
const { createNotification } = require("../utils/notify");
// multer upload — only needed for image upload route
let upload = null;
try { upload = require("../middleware/upload").upload; } catch (e) { console.warn("Upload middleware not found — image upload disabled"); }

const router = express.Router();

// Treats a station with NO approvalStatus field at all (every station
// created before this field existed — see the migration note on GET / for
// why that's the normal case for old data) the same as "Approved". Use
// this everywhere approvalStatus is checked, so a legacy station never
// gets treated as an unapproved partner application by accident.
const isApproved = (station) => station.approvalStatus === "Approved" || station.approvalStatus == null;

// GET /api/stations — public discovery, but "public" doesn't mean "every
// row in the table". A Partner application that hasn't been approved yet
// must not be visible to riders (beta_model.txt §47) or count in
// landing-page stats. A Station Manager can still see their own pending/
// rejected station (to check application status); Admin sees everything.
router.get("/", optionalAuth, async (req, res) => {
  try {
    const role = req.user?.role;
    // `{ $exists: false }` matters here: a station created before the
    // approvalStatus field existed has NO such key in its stored document
    // at all — Mongoose's schema default ("Approved") only applies to
    // NEW documents, it is never retroactively applied to old ones. A
    // filter of just `{ approvalStatus: "Approved" }` matched zero of
    // those pre-existing stations, which is why Find Stations showed
    // nothing for ordinary riders. Treating "the field was never set" the
    // same as "Approved" is correct here too: those stations were public
    // and bookable before this approval system existed, so it's the same
    // legacy status a straight backfill migration would also produce (see
    // config/db.js repairStationApprovalStatus, which does that backfill
    // so this OR clause becomes a no-op safety net rather than the only
    // thing making these stations visible).
    const approvedOrLegacy = { $or: [{ approvalStatus: "Approved" }, { approvalStatus: { $exists: false } }] };
    let filter;
    if (role === "Admin") {
      filter = {}; // full visibility, including pending/rejected applications
    } else if (role === "Station Manager") {
      filter = { $or: [...approvedOrLegacy.$or, { managerId: req.user.id }] };
    } else {
      filter = approvedOrLegacy;
    }
    const stations = await Station.find(filter).populate("managerId", "name email");
    res.json({ stations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stations/partner-applications — Admin only. Queue of partner
// signups awaiting a decision (default) or any status via ?status=.
router.get("/partner-applications", verifyToken, requireRole("Admin"), async (req, res) => {
  try {
    const status = ["Pending", "Approved", "Rejected"].includes(req.query.status) ? req.query.status : "Pending";
    const stations = await Station.find({ networkType: "Partner", approvalStatus: status })
      .populate("managerId", "name email")
      .sort({ createdAt: -1 });
    res.json({ stations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/stations/:id/approve — Admin only. Flips a Partner application
// live: approvalStatus -> Approved, status -> Online (so it's immediately
// bookable, matching what a manager would expect after approval).
router.put("/:id/approve", verifyToken, requireRole("Admin"), async (req, res) => {
  try {
    const station = await Station.findById(req.params.id);
    if (!station) return res.status(404).json({ error: "Station not found" });
    if (station.approvalStatus === "Approved") {
      return res.status(409).json({ error: "This station is already approved." });
    }

    station.approvalStatus = "Approved";
    station.status = "Online";
    station.approvedBy = req.user.id;
    station.approvedAt = new Date();
    station.rejectionReason = null;
    await station.save();

    await logAudit({ actor: req.user, action: "station.approve", targetType: "Station", targetId: station._id, details: `Approved partner station "${station.name}"` });
    if (station.managerId) {
      createNotification(station.managerId, "partner_application_approved", `Great news — "${station.name}" has been approved and is now live on ChargeWay.`);
    }

    res.json({ message: "Station approved and is now live.", station });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/stations/:id/reject — Admin only. Requires a reason so the
// manager knows what to fix (matches the "ChangesRequired"-style feedback
// loop in beta_model.txt §47, simplified to Approve/Reject for this pass).
router.put("/:id/reject", verifyToken, requireRole("Admin"), async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: "A rejection reason is required so the applicant knows what to fix." });
    }
    const station = await Station.findById(req.params.id);
    if (!station) return res.status(404).json({ error: "Station not found" });

    station.approvalStatus = "Rejected";
    station.status = "Offline";
    station.rejectionReason = reason.trim();
    station.approvedBy = req.user.id;
    station.approvedAt = new Date();
    await station.save();

    await logAudit({ actor: req.user, action: "station.reject", targetType: "Station", targetId: station._id, details: `Rejected partner station "${station.name}": ${reason.trim()}` });
    if (station.managerId) {
      createNotification(station.managerId, "partner_application_rejected", `Your application for "${station.name}" needs changes: ${reason.trim()}`);
    }

    res.json({ message: "Station application rejected.", station });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stations/:id
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const station = await Station.findById(req.params.id).populate("managerId", "name email");
    if (!station) return res.status(404).json({ error: "Station not found" });

    const role = req.user?.role;
    const isOwner = role === "Station Manager" && String(station.managerId?._id || station.managerId) === String(req.user?.id);
    if (!isApproved(station) && role !== "Admin" && !isOwner) {
      // Same response as "doesn't exist" — an unapproved station's
      // existence, name, and address shouldn't be discoverable by riders
      // just by guessing/enumerating IDs.
      return res.status(404).json({ error: "Station not found" });
    }

    res.json({ station });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stations/:id/popular-times — real histogram from completed
// bookings at this station, bucketed into 6 dayparts. Public (no auth)
// since it's aggregate, non-personal data shown on the station detail page.
router.get("/:id/popular-times", async (req, res) => {
  try {
    const bookings = await Booking.find({ stationId: req.params.id, status: "Completed" }).select("timeSlot");

    const buckets = [
      { label: "Early Morning", range: [5, 9],   count: 0 },
      { label: "Morning",       range: [9, 12],  count: 0 },
      { label: "Afternoon",     range: [12, 17], count: 0 },
      { label: "Evening",       range: [17, 21], count: 0 },
      { label: "Night",         range: [21, 24], count: 0 },
      { label: "Late Night",    range: [0, 5],   count: 0 },
    ];

    const parseHour = (slot) => {
      const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec((slot || "").trim());
      if (!m) return null;
      let h = parseInt(m[1], 10);
      const isPM = /PM/i.test(m[3]);
      if (isPM && h !== 12) h += 12;
      if (!isPM && h === 12) h = 0;
      return h;
    };

    bookings.forEach(b => {
      const h = parseHour(b.timeSlot);
      if (h === null) return;
      const bucket = buckets.find(bk => h >= bk.range[0] && h < bk.range[1]);
      if (bucket) bucket.count += 1;
    });

    const max = Math.max(1, ...buckets.map(b => b.count));
    res.json({
      buckets: buckets.map(b => ({ label: b.label, count: b.count, pct: Math.round((b.count / max) * 100) })),
      sampleSize: bookings.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stations — Admin only
router.post("/", verifyToken, requireRole("Admin"), async (req, res) => {
  try {
    if (!req.body.managerId) {
      return res.status(400).json({ error: "Every station must have a manager assigned." });
    }
    const manager = await User.findById(req.body.managerId);
    if (!manager || manager.role !== "Station Manager") {
      return res.status(400).json({ error: "managerId must belong to an existing Station Manager account." });
    }
    const station = new Station(req.body);
    await station.save();
    const populated = await Station.findById(station._id).populate("managerId", "name email");
    res.status(201).json({ station: populated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/stations/:id/status
router.put("/:id/status", verifyToken, requireRole("Station Manager", "Admin"), async (req, res) => {
  try {
    const station = await Station.findById(req.params.id);
    if (!station) return res.status(404).json({ error: "Not found" });
    if (req.user.role === "Station Manager" && String(station.managerId) !== String(req.user.id))
      return res.status(403).json({ error: "Not your station" });
    // Without this check, a manager whose partner application is still
    // Pending (or was Rejected) could just call this endpoint directly to
    // flip themselves Online — completely bypassing the admin approval
    // gate that GET /stations and POST /bookings both rely on.
    if (req.body.status === "Online" && !isApproved(station)) {
      return res.status(403).json({ error: "This station can't go online until an Admin approves your partner application." });
    }
    station.status = req.body.status;
    await station.save();
    await logAudit({ actor: req.user, action: "station.status_change", targetType: "Station", targetId: station._id, details: `Set ${station.name} to ${req.body.status}` });
    res.json({ station });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/stations/:id/charger/:chargerId
router.put("/:id/charger/:chargerId", verifyToken, requireRole("Station Manager", "Admin"), async (req, res) => {
  try {
    const station = await Station.findById(req.params.id);
    if (!station) return res.status(404).json({ error: "Station not found" });
    if (req.user.role === "Station Manager" && String(station.managerId) !== String(req.user.id)) {
      return res.status(403).json({ error: "Not your station" });
    }
    const charger = station.chargers.find(c => c.id === parseInt(req.params.chargerId));
    if (!charger) return res.status(404).json({ error: "Charger not found" });

    const changes = [];

    // Hardware upgrade path — e.g. swapping an AC 7kW unit for a DC 180kW
    // ultra-fast charger. Only allowed while the charger isn't mid-session:
    // changing power/type out from under an active booking would silently
    // invalidate the price and energy numbers that booking already locked
    // in (see routes/bookings.js — costPerKwh/energyKwh are snapshotted at
    // booking time, not recomputed from the charger's current spec).
    if (req.body.type != null || req.body.power != null) {
      if (["Reserved", "Charging"].includes(charger.status)) {
        return res.status(400).json({ error: "Can't change charger hardware while it's reserved or actively charging. Wait for the current session to finish." });
      }
      if (req.body.type != null) {
        const type = String(req.body.type).trim();
        if (!type) return res.status(400).json({ error: "Charger type can't be empty." });
        changes.push(`type ${charger.type} → ${type}`);
        charger.type = type;
      }
      if (req.body.power != null) {
        const power = Number(req.body.power);
        if (!Number.isFinite(power) || power <= 0 || power > 1000) {
          return res.status(400).json({ error: "Power must be a realistic kW value between 0 and 1000." });
        }
        changes.push(`power ${charger.power}kW → ${power}kW`);
        charger.power = power;
      }
    }

    // Charging/Reserved are system-managed by the booking lifecycle (a
    // booking reserves the charger, verify-checkin starts it) — letting a
    // manager set those manually would let a charger show "Charging" with
    // no real booking behind it. Manual control is limited to opening it
    // back up or taking it out of service.
    if (req.body.status !== undefined) {
      if (!["Available", "Maintenance"].includes(req.body.status)) {
        return res.status(400).json({ error: "Chargers can only be manually set to Available or Maintenance — Reserved/Charging follow bookings automatically." });
      }
      changes.push(`status → ${req.body.status}`);
      charger.status = req.body.status;
    }

    if (changes.length === 0) {
      return res.status(400).json({ error: "Nothing to update — provide status, type, and/or power." });
    }

    await station.save();
    await logAudit({ actor: req.user, action: "charger.update", targetType: "Station", targetId: station._id, details: `Charger #${charger.id} at ${station.name}: ${changes.join(", ")}` });
    res.json({ station, message: `Charger #${charger.id} updated: ${changes.join(", ")}.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/stations/:id/settings — Manager: price, facilities, name, address, lat, lng
router.put("/:id/settings", verifyToken, requireRole("Station Manager", "Admin"), async (req, res) => {
  try {
    const station = await Station.findById(req.params.id);
    if (!station) return res.status(404).json({ error: "Station not found" });
    if (req.user.role === "Station Manager" && String(station.managerId) !== String(req.user.id))
      return res.status(403).json({ error: "Not your station" });

    const { price_per_kwh, facilities, name, address, lat, lng, peakPricing } = req.body;

    if (price_per_kwh !== undefined) {
      if (isNaN(price_per_kwh) || price_per_kwh <= 0)
        return res.status(400).json({ error: "Price must be a positive number" });
      station.price_per_kwh = parseFloat(price_per_kwh);
    }
    if (facilities !== undefined) station.facilities = facilities;
    if (name      !== undefined) station.name        = name.trim();
    if (address   !== undefined) station.address     = address.trim();
    if (lat       !== undefined) station.lat         = parseFloat(lat);
    if (lng       !== undefined) station.lng         = parseFloat(lng);
    if (peakPricing !== undefined) {
      // Merge rather than replace, so a partial update (e.g. just toggling
      // "enabled") doesn't wipe out the rest of the schedule.
      station.peakPricing = { ...(station.peakPricing?.toObject?.() || station.peakPricing || {}), ...peakPricing };
    }
    // Only Admin can reclassify a station as Owned/Partner — a station
    // manager shouldn't be able to self-declare which pricing rules apply.
    if (req.body.networkType !== undefined && req.user.role === "Admin") {
      station.networkType = req.body.networkType === "Partner" ? "Partner" : "Owned";
    }

    await station.save();
    await logAudit({ actor: req.user, action: "station.settings_update", targetType: "Station", targetId: station._id, details: `Updated settings for ${station.name}` });
    const populated = await Station.findById(station._id).populate("managerId", "name email");
    res.json({ station: populated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/stations/:id/edit — Admin only: full edit including managerId
router.put("/:id/edit", verifyToken, requireRole("Admin"), async (req, res) => {
  try {
    const station = await Station.findById(req.params.id);
    if (!station) return res.status(404).json({ error: "Station not found" });

    const { name, address, lat, lng, price_per_kwh, facilities, managerId, status, networkType } = req.body;

    if (name          !== undefined) station.name          = name.trim();
    if (address       !== undefined) station.address       = address.trim();
    if (lat           !== undefined) station.lat           = parseFloat(lat);
    if (lng           !== undefined) station.lng           = parseFloat(lng);
    if (price_per_kwh !== undefined) station.price_per_kwh = parseFloat(price_per_kwh);
    if (facilities    !== undefined) station.facilities    = facilities;
    if (status        !== undefined) station.status        = status;
    if (networkType   !== undefined) station.networkType   = networkType === "Partner" ? "Partner" : "Owned";

    if (managerId !== undefined) {
      if (!managerId) {
        return res.status(400).json({ error: "Every station must have a manager — assign a different one instead of removing it." });
      }
      const manager = await User.findById(managerId);
      if (!manager || manager.role !== "Station Manager") {
        return res.status(400).json({ error: "managerId must belong to an existing Station Manager account." });
      }
      station.managerId = managerId;
    }

    await station.save();
    const populated = await Station.findById(station._id).populate("managerId", "name email");
    res.json({ station: populated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stations/:id/image
router.post("/:id/image", verifyToken, requireRole("Station Manager", "Admin"), async (req, res) => {
  if (!upload) return res.status(501).json({ error: "Image upload not configured" });
  upload.single("image")(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    try {
      const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
      await Station.findByIdAndUpdate(req.params.id, { image: imageUrl });
      res.json({ imageUrl });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
});

// DELETE /api/stations/:id — Admin only
router.delete("/:id", verifyToken, requireRole("Admin"), async (req, res) => {
  try {
    const station = await Station.findById(req.params.id);
    if (!station) return res.status(404).json({ error: "Station not found" });
    await Booking.updateMany(
      { stationId: station._id, status: "Upcoming" },
      { $set: { status: "Cancelled" } }
    );
    await Station.findByIdAndDelete(req.params.id);
    res.json({ message: "Station deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;