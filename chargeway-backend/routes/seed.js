const express = require("express");
const User    = require("../models/User");
const Station = require("../models/Station");
const Booking = require("../models/Booking");

const router = express.Router();

// POST /api/seed — Dev only. Requires SEED_SECRET so a reachable dev/staging
// server can't have its database wiped by anyone who finds the URL.
router.post("/seed", async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "Seed not allowed in production" });
  }

  const expectedSecret = process.env.SEED_SECRET;
  if (expectedSecret) {
    const provided = req.headers["x-seed-secret"] || req.body?.secret;
    if (provided !== expectedSecret) {
      return res.status(401).json({ error: "Invalid or missing seed secret. Pass it as header 'x-seed-secret'." });
    }
  } else {
    console.warn("⚠️  SEED_SECRET is not set — /api/seed is unauthenticated. Set SEED_SECRET in .env before deploying anywhere reachable.");
  }

  try {
    await User.deleteMany({});
    await Station.deleteMany({});
    await Booking.deleteMany({});

    const adminUser = await new User({
      name: "Sam Admin", email: "sam.admin@chargeway.com", phone: "9000000001",
      password: "password", role: "Admin", joinDate: new Date("2024-01-01"),
      isVerified: true,
    }).save();

    const managerUser = await new User({
      name: "Alex Station", email: "alex.station@chargeway.com", phone: "9123456780",
      password: "password", role: "Station Manager", joinDate: new Date("2024-02-10"),
      isVerified: true,
    }).save();

    const regularUser = new User({
      name: "Priyansh Patel", email: "priyanshpatel@gmail.com", phone: "9876543210",
      password: "password", role: "User", joinDate: new Date("2024-01-15"),
      isVerified: true,
      cars: [{
        brand: "Tata", model: "Nexon EV", battery_kwh: 40.5, range_km: 453,
        color: "Signature Teal", efficiency: 11.1, vehicleNumber: "MH12AB3456",
        battery: 85, batteryHealth: 96, connectorType: "CCS2", isFavorite: true,
      }],
    });
    regularUser.syncPrimaryCar(); // keeps legacy `car` field in sync with `cars`
    await regularUser.save();

    const station1 = await new Station({
      name: "GreenCharge Hub", managerId: managerUser._id,
      address: "123 EV Lane, Gujarat", lat: 19.076, lng: 72.8777, status: "Online",
      chargers: [
        { id: 1, status: "Charging",     type: "DC Fast",       power: 50  },
        { id: 2, status: "Available",    type: "DC Fast",       power: 50  },
        { id: 3, status: "Available",    type: "AC Slow",       power: 7   },
        { id: 4, status: "Maintenance",  type: "DC Ultra-Fast", power: 150 },
        { id: 5, status: "Available",    type: "DC Fast",       power: 50  },
        { id: 6, status: "Available",    type: "AC Slow",       power: 7   },
      ],
      price_per_kwh: 18, facilities: ["Restroom", "Cafe", "Wi-Fi"],
    }).save();

    const station2 = await new Station({
      name: "VoltPoint Central", managerId: null,
      address: "456 Charge Road, Mumbai", lat: 19.22, lng: 72.97, status: "Online",
      chargers: [
        { id: 1, status: "Available", type: "DC Fast", power: 50 },
        { id: 2, status: "Available", type: "AC Slow", power: 7  },
        { id: 3, status: "Available", type: "DC Fast", power: 50 },
      ],
      price_per_kwh: 20, facilities: ["Parking", "CCTV", "24/7 Open"],
    }).save();

    await new Booking({
      userId: regularUser._id, stationId: station1._id, stationName: "GreenCharge Hub",
      chargerId: 2, vehicleNumber: "MH12AB3456", timeSlot: "04:30 PM",
      date: "2025-02-10", duration: 45, energyKwh: 22.5,
      costPerKwh: 18, platformFee: 20, totalCost: 425.00, status: "Completed", paymentMethod: "UPI",
    }).save();

    await new Booking({
      userId: regularUser._id, stationId: station2._id, stationName: "VoltPoint Central",
      chargerId: 1, vehicleNumber: "MH12AB3456", timeSlot: "06:00 PM",
      date: "2025-02-15", duration: 30, energyKwh: 18,
      costPerKwh: 20, platformFee: 20, totalCost: 380.00, status: "Completed", paymentMethod: "Credit Card",
    }).save();

    res.json({
      message: "✅ Database seeded successfully",
      users: 3, stations: 2, bookings: 2,
      demoCredentials: [
        { role: "Admin",           email: "sam.admin@chargeway.com",     password: "password" },
        { role: "Station Manager", email: "alex.station@chargeway.com",  password: "password" },
        { role: "User",            email: "priyanshpatel@gmail.com",     password: "password" },
      ],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
