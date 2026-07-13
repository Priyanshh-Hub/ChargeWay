/**
 * ChargeWay Backend — server.js
 * App setup and server start only.
 */

const express = require("express");
const cors    = require("cors");
const dotenv  = require("dotenv");
const fs      = require("fs");

dotenv.config();

const { connectDB } = require("./config/db");

// ── Routes ───────────────────────────────────────────────────
const authRoutes      = require("./routes/auth");
const userRoutes      = require("./routes/users");
const stationRoutes   = require("./routes/stations");
const bookingRoutes   = require("./routes/bookings");
const analyticsRoutes = require("./routes/analytics");
const reportRoutes    = require("./routes/report");
const seedRoute       = require("./routes/seed");
const reviewRoutes    = require("./routes/reviews");

// ── App Setup ────────────────────────────────────────────────
const app = express();

// Set ALLOWED_ORIGINS in .env (comma-separated) for production, e.g.
// ALLOWED_ORIGINS=https://app.chargeway.com,https://chargeway.com
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim())
  : ["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
app.use("/uploads", express.static("uploads"));

// ── Mount Routes ─────────────────────────────────────────────
app.use("/api/auth",      authRoutes);
app.use("/api/user",      userRoutes);
app.use("/api/users",     userRoutes);
app.use("/api/stations",  stationRoutes);
app.use("/api/bookings",  bookingRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/report",    reportRoutes);
app.use("/api/reviews",   reviewRoutes);
app.use("/api",           seedRoute);

// ── Connect DB & Start ────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 ChargeWay API running at http://localhost:${PORT}`);
    console.log(`\n📋 Endpoints:`);
    console.log(`   POST   /api/auth/register`);
    console.log(`   POST   /api/auth/login`);
    console.log(`   GET    /api/auth/me`);
    console.log(`   GET    /api/auth/verify-email/:token`);
    console.log(`   POST   /api/auth/resend-verification`);
    console.log(`   POST   /api/auth/forgot-password`);
    console.log(`   POST   /api/auth/reset-password`);
    console.log(`   PUT    /api/user/car        [legacy]`);
    console.log(`   GET    /api/user/vehicles`);
    console.log(`   POST   /api/user/vehicles`);
    console.log(`   PUT    /api/user/vehicles/:id`);
    console.log(`   PUT    /api/user/vehicles/:id/favorite`);
    console.log(`   DELETE /api/user/vehicles/:id`);
    console.log(`   GET    /api/users          [Admin]`);
    console.log(`   GET    /api/stations`);
    console.log(`   POST   /api/bookings`);
    console.log(`   GET    /api/bookings`);
    console.log(`   GET    /api/analytics      [Admin/Manager]`);
    console.log(`   GET    /api/report/excel   [Admin]`);
    console.log(`   POST   /api/seed           [Dev only]\n`);
  });
});
