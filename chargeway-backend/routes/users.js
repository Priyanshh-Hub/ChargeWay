const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Station = require("../models/Station");
const Booking = require("../models/Booking");
const { verifyToken, requireRole } = require("../middleware/auth");

const router = express.Router();

// PUT /api/user/car
router.put("/car", verifyToken, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user.id, { car: req.body }, { new: true });
    res.json({ user: user.toSafeJSON() });
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
    if (newPassword.length < 6)
      return res.status(400).json({ error: "New password must be at least 6 characters" });
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