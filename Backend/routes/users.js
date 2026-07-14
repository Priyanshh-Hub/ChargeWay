const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Station = require("../models/Station");
const Booking = require("../models/Booking");
const { verifyToken, requireRole } = require("../middleware/auth");

const router = express.Router();

// PUT /api/user/car — legacy single-vehicle endpoint, kept for backward
// compatibility (used by the first-run vehicle setup screen). Internally
// this now just adds/updates the favorite entry in `cars`.
router.put("/car", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const carData = { ...req.body, isFavorite: true, addedAt: new Date() };
    user.cars.forEach(c => { c.isFavorite = false; });
    user.cars.push(carData);
    user.syncPrimaryCar();
    await user.save();

    res.json({ user: user.toSafeJSON() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Vehicle management (multi-vehicle) ──────────────────────

// GET /api/user/vehicles
router.get("/vehicles", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ vehicles: user.cars });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/user/vehicles — add a new vehicle
router.post("/vehicles", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.cars.length >= 6) {
      return res.status(400).json({ error: "You can save up to 6 vehicles. Remove one to add another." });
    }

    const { brand, model, vehicleNumber } = req.body;
    if (!brand || !model || !vehicleNumber) {
      return res.status(400).json({ error: "Brand, model and vehicle number are required." });
    }

    const isFirst = user.cars.length === 0;
    const newCar = {
      ...req.body,
      battery: req.body.battery ?? 85,
      batteryHealth: req.body.batteryHealth ?? 100,
      connectorType: req.body.connectorType || "CCS2",
      isFavorite: isFirst, // first vehicle is auto-favorited
      addedAt: new Date(),
    };

    user.cars.push(newCar);
    user.syncPrimaryCar();
    await user.save();

    res.status(201).json({ user: user.toSafeJSON(), vehicles: user.cars });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/user/vehicles/:vehicleId — edit a vehicle
router.put("/vehicles/:vehicleId", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const vehicle = user.cars.id(req.params.vehicleId);
    if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });

    const editable = ["nickname", "vehicleNumber", "battery", "batteryHealth", "connectorType", "color"];
    editable.forEach(field => {
      if (req.body[field] !== undefined) vehicle[field] = req.body[field];
    });

    user.syncPrimaryCar();
    await user.save();

    res.json({ user: user.toSafeJSON(), vehicles: user.cars });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/user/vehicles/:vehicleId/favorite — set as primary vehicle
router.put("/vehicles/:vehicleId/favorite", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const vehicle = user.cars.id(req.params.vehicleId);
    if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });

    user.cars.forEach(c => { c.isFavorite = String(c._id) === req.params.vehicleId; });
    user.syncPrimaryCar();
    await user.save();

    res.json({ user: user.toSafeJSON(), vehicles: user.cars });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/user/vehicles/:vehicleId
router.delete("/vehicles/:vehicleId", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const vehicle = user.cars.id(req.params.vehicleId);
    if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });

    const wasFavorite = vehicle.isFavorite;
    vehicle.deleteOne();

    if (wasFavorite && user.cars.length > 0) {
      user.cars[0].isFavorite = true;
    }
    user.syncPrimaryCar();
    await user.save();

    res.json({ user: user.toSafeJSON(), vehicles: user.cars });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/user/profile
router.put("/profile", verifyToken, async (req, res) => {
  try {
    const { name, phone } = req.body;
    const user = await User.findByIdAndUpdate(req.user.id, { name, phone }, { new: true });
    res.json({ user: user.toSafeJSON() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/user/password
router.put("/password", verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ error: "Both current and new password are required" });
    if (newPassword.length < 8)
      return res.status(400).json({ error: "New password must be at least 8 characters" });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch)
      return res.status(401).json({ error: "Current password is incorrect" });
    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/user/preferences
router.put("/preferences", verifyToken, async (req, res) => {
  try {
    const { emailNotifications, smsNotifications, promotions } = req.body;
    const update = {};
    if (emailNotifications !== undefined) update["preferences.emailNotifications"] = emailNotifications;
    if (smsNotifications   !== undefined) update["preferences.smsNotifications"]   = smsNotifications;
    if (promotions         !== undefined) update["preferences.promotions"]         = promotions;

    const user = await User.findByIdAndUpdate(req.user.id, { $set: update }, { new: true });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user: user.toSafeJSON() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/user/me — self-service account deletion, requires password confirmation
router.delete("/me", verifyToken, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: "Enter your password to confirm account deletion." });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ error: "Incorrect password." });

    await User.findByIdAndDelete(req.user.id);
    res.json({ message: "Account deleted." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/user/favorites — list favorited station IDs
router.get("/favorites", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ favoriteStations: user.favoriteStations || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/user/favorites/:stationId — toggle a station's favorite status
router.put("/favorites/:stationId", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const idx = user.favoriteStations.findIndex(id => String(id) === req.params.stationId);
    let isFavorite;
    if (idx >= 0) { user.favoriteStations.splice(idx, 1); isFavorite = false; }
    else { user.favoriteStations.push(req.params.stationId); isFavorite = true; }

    await user.save();
    res.json({ favoriteStations: user.favoriteStations, isFavorite });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users — Admin only
router.get("/", verifyToken, requireRole("Admin"), async (req, res) => {
  try {
    const users = await User.find({}, "-password").sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id/suspend — Admin only: toggle suspend/unsuspend
router.put("/:id/suspend", verifyToken, requireRole("Admin"), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.role === "Admin")
      return res.status(400).json({ error: "Cannot suspend an Admin" });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ user: user.toSafeJSON(), suspended: !user.isActive });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id — Admin only
router.delete("/:id", verifyToken, requireRole("Admin"), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (String(user._id) === String(req.user.id))
      return res.status(400).json({ error: "You cannot delete your own account" });
    if (user.role === "Station Manager")
      await Station.updateMany({ managerId: user._id }, { $set: { managerId: null } });
    await Booking.updateMany(
      { userId: user._id, status: "Upcoming" },
      { $set: { status: "Cancelled" } }
    );
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;