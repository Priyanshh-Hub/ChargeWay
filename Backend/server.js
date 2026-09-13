/**
 * ChargeWay Backend — server.js
 * App setup and server start only.
 */

const express = require("express");
const cors    = require("cors");
const dotenv  = require("dotenv");
const fs      = require("fs");
const cookieParser = require("cookie-parser");
const pinoHttp = require("pino-http");

dotenv.config();

const { connectDB } = require("./config/db");
const logger = require("./utils/logger");
const { DEFAULT_DEV_SECRET } = require("./middleware/auth");

// Defensive require — if `npm install` hasn't been re-run after a code
// update that added this dependency, this would otherwise crash the
// entire server at startup with an opaque "Cannot find module" error
// before a single log line is written. Same pattern already used below
// for the optional `upload` middleware.
let helmet = null;
try { helmet = require("helmet"); } catch (e) {
  logger.warn("helmet is not installed — secure headers disabled. Run `npm install` in Backend/ to fix this.");
}

const isProduction = process.env.NODE_ENV === "production";

// Refuse to boot in production with the source-code-visible default JWT
// secret — that would let anyone forge a valid token (including one
// claiming role: "Admin") without ever touching the database. This check
// only ever blocks production; local dev keeps working with the fallback
// so a missing .env doesn't stop someone from just trying the app out.
if (isProduction && (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEFAULT_DEV_SECRET)) {
  logger.error("Refusing to start in production: JWT_SECRET is not set (or is still the default). Set a long random JWT_SECRET in the environment.");
  process.exit(1);
}

// ── Routes ───────────────────────────────────────────────────
const authRoutes      = require("./routes/auth");
const userRoutes      = require("./routes/users");
const stationRoutes   = require("./routes/stations");
const bookingRoutes   = require("./routes/bookings");
const analyticsRoutes = require("./routes/analytics");
const reportRoutes    = require("./routes/report");
const seedRoute       = require("./routes/seed");
const reviewRoutes    = require("./routes/reviews");
const paymentRoutes   = require("./routes/payments");
const supportRoutes   = require("./routes/support");
const notificationRoutes = require("./routes/notifications");
const platformConfigRoutes = require("./routes/platformConfig");

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
// Secure headers (X-Content-Type-Options, X-Frame-Options, HSTS, etc — see
// beta_model.txt §41 "API security: secure headers"). CSP and the
// cross-origin isolation headers are tuned off/relaxed below: this backend
// is a JSON API plus a static /uploads image server consumed by a frontend
// on a different origin/port, not a browser-navigated HTML site, so a
// default CSP would protect nothing and default COEP/CORP would actively
// break the frontend's <img src> tags pointing at /uploads.
app.use(helmet ? helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}) : (req, res, next) => next());
app.use(cookieParser());
app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === "/api/health" } }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
app.use("/uploads", express.static("uploads"));

app.get("/api/health", (req, res) => res.json({ status: "ok", uptime: process.uptime() }));

// ── Mount Routes ─────────────────────────────────────────────
app.use("/api/auth",      authRoutes);
app.use("/api/user",      userRoutes);
app.use("/api/users",     userRoutes);
app.use("/api/stations",  stationRoutes);
app.use("/api/bookings",  bookingRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/report",    reportRoutes);
app.use("/api/reviews",   reviewRoutes);
app.use("/api/payments",  paymentRoutes);
app.use("/api/support",   supportRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/platform-config", platformConfigRoutes);
app.use("/api",           seedRoute);

// ── Centralized error handler (catches anything a route forgot to try/catch) ──
app.use((err, req, res, next) => {
  logger.error({ err }, "Unhandled error");
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

// ── Connect DB & Start ────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    logger.info(`🚀 ChargeWay API running at http://localhost:${PORT}`);
  });
}).catch(() => {
  logger.error("Server not started — could not connect to MongoDB. Fix MONGO_URI and restart.");
  process.exit(1);
});
