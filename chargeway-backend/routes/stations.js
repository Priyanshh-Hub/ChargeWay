const express = require("express");
const Station = require("../models/Station");
const Booking = require("../models/Booking");
const User    = require("../models/User");
const { verifyToken, requireRole } = require("../middleware/auth");
// multer upload — only needed for image upload route
let upload = null;
try { upload = require("../middleware/upload").upload; } catch (e) { console.warn("Upload middleware not found — image upload disabled"); }

const router = express.Router();

// GET /api/stations
router.get("/", async (req, res) => {
  try {
    const stations = await Station.find().populate("managerId", "name email");
    res.json({ stations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stations/:id
router.get("/:id", async (req, res) => {
  try {
    const station = await Station.findById(req.params.id).populate("managerId", "name email");
    if (!station) return res.status(404).json({ error: "Station not found" });
    res.json({ station });
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
    station.status = req.body.status;
    await station.save();
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
    const charger = station.chargers.find(c => c.id === parseInt(req.params.chargerId));
    if (!charger) return res.status(404).json({ error: "Charger not found" });
    charger.status = req.body.status;
    await station.save();
    res.json({ station });
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

    const { price_per_kwh, facilities, name, address, lat, lng } = req.body;

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

    await station.save();
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

    const { name, address, lat, lng, price_per_kwh, facilities, managerId, status } = req.body;

    if (name          !== undefined) station.name          = name.trim();
    if (address       !== undefined) station.address       = address.trim();
    if (lat           !== undefined) station.lat           = parseFloat(lat);
    if (lng           !== undefined) station.lng           = parseFloat(lng);
    if (price_per_kwh !== undefined) station.price_per_kwh = parseFloat(price_per_kwh);
    if (facilities    !== undefined) station.facilities    = facilities;
    if (status        !== undefined) station.status        = status;

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