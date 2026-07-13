const express = require("express");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Station = require("../models/Station");
const { verifyToken, JWT_SECRET } = require("../middleware/auth");
const { loginLimiter, forgotPasswordLimiter, clearBucket, loginKey } = require("../middleware/rateLimiter");

const router = express.Router();

const isDev = process.env.NODE_ENV !== "production";

// Basic server-side password policy. Keep in sync with the frontend
// strength meter in src/utils/passwordStrength.js.
function validatePasswordStrength(password) {
  if (!password || password.length < 8) return "Password must be at least 8 characters.";
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) return "Password must include both letters and numbers.";
  return null;
}

function makeToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
}

function makeLongToken(user) {
  // Used when "Remember Me" is checked at login.
  return jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "30d" });
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const {
      name, email, phone, password, role,
      stationName, stationAddress,
      stationLat, stationLng,
      stationPricePerKwh, stationFacilities, stationChargers,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email and password are required.", code: "MISSING_FIELDS" });
    }

    const pwError = validatePasswordStrength(password);
    if (pwError) return res.status(400).json({ error: pwError, code: "WEAK_PASSWORD" });

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) return res.status(409).json({ error: "An account with this email already exists.", code: "EMAIL_EXISTS" });

    const verifyToken = crypto.randomBytes(32).toString("hex");
    const verifyTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const user = new User({
      name, email, phone, password, role: role || "User",
      isVerified: false, verifyToken, verifyTokenExpires,
    });
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

    const token = makeToken(user);

    // NOTE: No SMTP/email provider is wired up yet. In a real deployment,
    // send `verifyUrl` via email here instead of returning it in the response.
    const verifyUrl = `/verify-email/${verifyToken}`;
    if (isDev) console.log(`📧 [DEV] Verification link for ${user.email}: ${verifyUrl}`);

    res.status(201).json({
      token,
      user: user.toSafeJSON(),
      emailSimulated: true,
      ...(isDev && { devVerifyUrl: verifyUrl }),
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password, role, rememberMe } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required.", code: "MISSING_FIELDS" });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(401).json({ error: "Invalid email or password.", code: "INVALID_CREDENTIALS" });

    if (!user.isActive) {
      return res.status(403).json({ error: "This account has been suspended. Contact support for help.", code: "ACCOUNT_SUSPENDED" });
    }

    if (role && user.role !== role) {
      return res.status(401).json({ error: `No ${role} account found for this email.`, code: "ROLE_MISMATCH" });
    }

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ error: "Invalid email or password.", code: "INVALID_CREDENTIALS" });

    // Successful login clears this key's rate-limit bucket.
    clearBucket(loginKey(req));

    if (typeof rememberMe === "boolean") {
      user.rememberMe = rememberMe;
      await user.save();
    }

    const token = rememberMe ? makeLongToken(user) : makeToken(user);
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
    if (!user.isActive) return res.status(403).json({ error: "This account has been suspended.", code: "ACCOUNT_SUSPENDED" });
    res.json({ user: user.toSafeJSON() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/verify-email/:token
router.get("/verify-email/:token", async (req, res) => {
  try {
    const user = await User.findOne({
      verifyToken: req.params.token,
      verifyTokenExpires: { $gt: new Date() },
    });
    if (!user) return res.status(400).json({ error: "This verification link is invalid or has expired.", code: "INVALID_TOKEN" });

    user.isVerified = true;
    user.verifyToken = null;
    user.verifyTokenExpires = null;
    await user.save();

    res.json({ message: "Email verified successfully.", user: user.toSafeJSON() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/resend-verification
router.post("/resend-verification", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.isVerified) return res.json({ message: "Email is already verified." });

    user.verifyToken = crypto.randomBytes(32).toString("hex");
    user.verifyTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    const verifyUrl = `/verify-email/${user.verifyToken}`;
    if (isDev) console.log(`📧 [DEV] Verification link for ${user.email}: ${verifyUrl}`);

    res.json({ message: "Verification email resent.", ...(isDev && { devVerifyUrl: verifyUrl }) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/forgot-password
router.post("/forgot-password", forgotPasswordLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required." });

    const genericResponse = { message: "If an account exists for that email, a reset link has been sent." };
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Always respond the same way whether or not the account exists,
    // to avoid leaking which emails are registered.
    if (!user) return res.json(genericResponse);

    user.resetToken = crypto.randomBytes(32).toString("hex");
    user.resetTokenExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 min
    await user.save();

    const resetUrl = `/reset-password/${user.resetToken}`;
    if (isDev) console.log(`📧 [DEV] Password reset link for ${user.email}: ${resetUrl}`);

    res.json({ ...genericResponse, ...(isDev && { devResetUrl: resetUrl }) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/reset-password
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: "Token and new password are required." });

    const pwError = validatePasswordStrength(newPassword);
    if (pwError) return res.status(400).json({ error: pwError, code: "WEAK_PASSWORD" });

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpires: { $gt: new Date() },
    });
    if (!user) return res.status(400).json({ error: "This reset link is invalid or has expired.", code: "INVALID_TOKEN" });

    user.password = newPassword; // hashed by the pre-save hook
    user.resetToken = null;
    user.resetTokenExpires = null;
    await user.save();

    res.json({ message: "Password reset successfully. You can now log in." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
