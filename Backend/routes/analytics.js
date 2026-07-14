const express = require("express");
const Booking = require("../models/Booking");
const Station = require("../models/Station");
const User    = require("../models/User");
const { verifyToken, requireRole } = require("../middleware/auth");

const router = express.Router();

// GET /api/analytics
router.get("/", verifyToken, requireRole("Admin", "Station Manager"), async (req, res) => {
  try {
    const isManager = req.user.role === "Station Manager";

    let managerStation = null;
    if (isManager) {
      managerStation = await Station.findOne({ managerId: req.user.id });
      if (!managerStation) return res.status(404).json({ error: "No station assigned to you" });
    }

    const now = new Date();
    const months = [], monthlyRevenue = [], monthlySessions = [], monthlyUsers = [];

    for (let i = 11; i >= 0; i--) {
      const d     = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.toLocaleString("default", { month: "short" }));

      const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
      const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0];

      const bookingFilter = {
        status: "Completed",
        date: { $gte: start, $lte: end },
        ...(isManager && { stationId: managerStation._id }),
      };

      const completedInMonth = await Booking.find(bookingFilter);
      monthlyRevenue.push(completedInMonth.reduce((sum, b) => sum + (b.totalCost  || 0), 0));
      monthlySessions.push(completedInMonth.length);

      if (!isManager) {
        const usersInMonth = await User.countDocuments({
          joinDate: { $gte: new Date(start), $lte: new Date(end) },
          role: "User",
        });
        monthlyUsers.push(usersInMonth);
      } else {
        monthlyUsers.push(0);
      }
    }

    // Station revenue breakdown
    const stationRevenue = {};
    const stations = isManager ? [managerStation] : await Station.find({});
    for (const station of stations) {
      const bookings = await Booking.find({ stationId: station._id, status: "Completed" });
      stationRevenue[station.name] = bookings.reduce((s, b) => s + (b.totalCost || 0), 0);
    }

    // Totals
    const totalBookingFilter = isManager ? { stationId: managerStation._id } : {};
    const completedFilter    = { ...totalBookingFilter, status: "Completed" };

    const totalRevenue = await Booking.aggregate([
      { $match: completedFilter },
      { $group: { _id: null, total: { $sum: "$totalCost" } } },
    ]);

    // ✅ Total energy delivered (for CO₂ calculation in UI)
    const totalEnergy = await Booking.aggregate([
      { $match: completedFilter },
      { $group: { _id: null, total: { $sum: "$energyKwh" } } },
    ]);

    res.json({
      months,
      monthlyRevenue,
      monthlySessions,
      monthlyUsers,
      stationRevenue,
      totals: {
        revenue:  totalRevenue[0]?.total || 0,
        energy:   totalEnergy[0]?.total  || 0,   // ✅ NEW
        users:    isManager ? null : await User.countDocuments({ role: "User" }),
        bookings: await Booking.countDocuments(totalBookingFilter),
        stations: isManager ? 1 : await Station.countDocuments(),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;