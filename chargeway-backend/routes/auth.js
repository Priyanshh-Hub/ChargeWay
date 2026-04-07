const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Station = require("../models/Station");
const { verifyToken, JWT_SECRET } = require("../middleware/auth");

const router = express.Router();

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const {
      name, email, phone, password, role,
      stationName, stationAddress,
      stationLat, stationLng,
      stationPricePerKwh, stationFacilities, stationChargers,
    } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const user = new User({ name, email, phone, password, role: role || "User" });
    await user.save();

    if (role === "Station Manager" && stationName) {
      const station = new Station({
        name: stationName,
        address: stationAddress || "Address not set",
        lat: stationLat || 20.5937,
        lng: stationLng || 78.9629,
        managerId: user._id,
        chargers: stationChargers && stationChargers.length > 0
          ? stationChargers
          : [
              { id: 1, status: "Available", type: "DC Fast", power: 50 },
              { id: 2, status: "Available", type: "AC Slow", power: 7 },
            ],
        price_per_kwh: stationPricePerKwh || 18,
        facilities: stationFacilities || [],
        status: "Online",
      });
      await station.save();
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    res.status(201).json({ token, user: user.toSafeJSON() });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    if (user.role !== role) return res.status(401).json({ error: "Role mismatch" });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: user.toSafeJSON() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user: user.toSafeJSON() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
