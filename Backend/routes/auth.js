const express = require("express");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Station = require("../models/Station");
const { verifyToken, JWT_SECRET } = require("../middleware/auth");
const { loginLimiter, forgotPasswordLimiter, clearBucket, loginKey } = require("../middleware/rateLimiter");
const { validate, registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, googleAuthSchema } = require("../middleware/validate");
const email = require("../utils/email");
const googleAuth = require("../utils/googleAuth");
const logger = require("../utils/logger");
const { createNotification } = require("../utils/notify");

const router = express.Router();

const isDev = process.env.NODE_ENV !== "production";
const COOKIE_NAME = "cw_token";

function makeToken(user, expiresIn = "7d") {
  return jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn });
}

// Sets the JWT as an httpOnly cookie *in addition to* returning it in the
// JSON body — additive so existing localStorage-based frontend code keeps
// working unmodified, while giving the option to move to cookie auth later.
function setAuthCookie(res, token, days = 7) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: !isDev,
    sameSite: isDev ? "lax" : "none",
    maxAge: days * 24 * 60 * 60 * 1000,
  });
}

// POST /api/auth/register
router.post("/register", validate(registerSchema), async (req, res) => {
  try {
    const {
      name, email: emailAddr, phone, password, role,
      stationName, stationAddress, businessName, businessType,
      stationLat, stationLng,
      stationPricePerKwh, stationFacilities, stationChargers,
    } = req.body;

    const existing = await User.findOne({ email: emailAddr.toLowerCase().trim() });
    if (existing) return res.status(409).json({ error: "An account with this email already exists.", code: "EMAIL_EXISTS" });

    const verifyTokenValue = crypto.randomBytes(32).toString("hex");
    const verifyTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const user = new User({
      name, email: emailAddr, phone, password, role: role || "User",
      isVerified: false, verifyToken: verifyTokenValue, verifyTokenExpires,
    });
    await user.save();

    let station = null;
    if (role === "Station Manager" && stationName) {
      // A public sign-up is a PARTNER APPLICATION, not an instant listing —
      // see beta_model.txt §47. It starts Pending/Offline: invisible to
      // riders and unbookable until an Admin reviews it (routes/stations.js
      // GET / filters on approvalStatus, POST /bookings rejects unapproved
      // stations). This also fixes a real misclassification bug: before
      // this, EVERY self-registered station defaulted to networkType
      // "Owned" — indistinguishable from a real ChargeWay-run station,
      // with no review step at all.
      station = new Station({
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
        status: "Offline",
        networkType: "Partner",
        approvalStatus: "Pending",
        businessName: businessName?.trim() || stationName,
        businessType: businessType || null,
      });
      await station.save();

      // Fire-and-forget notification to every Admin — see utils/notify.js;
      // failures here never block registration itself.
      User.find({ role: "Admin" }).select("_id").then(admins => {
        admins.forEach(a => createNotification(
          a._id, "partner_application_submitted",
          `${name} applied to list "${stationName}" as a partner station. Review it in Partner Applications.`
        ));
      }).catch(() => {});
    }

    const token = makeToken(user);
    setAuthCookie(res, token);

    // Sends a real email when SMTP_* is configured; otherwise logs to
    // console and returns the link in the response (dev-only), same
    // fallback behaviour as before.
    const { sent, verifyUrl } = await email.sendVerificationEmail(user, verifyTokenValue);
    if (!sent && isDev) logger.info(`Verification link for ${user.email}: ${verifyUrl}`);

    res.status(201).json({
      token,
      user: user.toSafeJSON(),
      emailSimulated: !sent,
      ...(isDev && !sent && { devVerifyUrl: verifyUrl }),
    });
  } catch (err) {
    logger.error({ err }, "Register error");
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post("/login", loginLimiter, validate(loginSchema), async (req, res) => {
  try {
    const { email: emailAddr, password, role, rememberMe } = req.body;

    const user = await User.findOne({ email: emailAddr.toLowerCase().trim() });
    if (!user) return res.status(401).json({ error: "Invalid email or password.", code: "INVALID_CREDENTIALS" });

    if (!user.isActive) {
      return res.status(403).json({ error: "This account has been suspended. Contact support for help.", code: "ACCOUNT_SUSPENDED" });
    }

    if (user.authProvider === "google" && !user.password) {
      return res.status(400).json({ error: "This account uses Google Sign-In. Use the Google button to log in.", code: "GOOGLE_ACCOUNT" });
    }

    if (role && user.role !== role) {
      return res.status(401).json({ error: `No ${role} account found for this email.`, code: "ROLE_MISMATCH" });
    }

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ error: "Invalid email or password.", code: "INVALID_CREDENTIALS" });

    // Successful login clears this key's rate-limit bucket.
    await clearBucket(loginKey(req));

    if (typeof rememberMe === "boolean") {
      user.rememberMe = rememberMe;
      await user.save();
    }

    const token = rememberMe ? makeToken(user, "30d") : makeToken(user);
    setAuthCookie(res, token, rememberMe ? 30 : 7);
    res.json({ token, user: user.toSafeJSON() });
  } catch (err) {
    logger.error({ err }, "Login error");
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/google — Google Sign-In (register or login)
// Frontend sends the ID token from Google's client-side button
// (@react-oauth/google's credentialResponse.credential).
router.post("/google", validate(googleAuthSchema), async (req, res) => {
  try {
    if (!googleAuth.isConfigured()) {
      return res.status(503).json({
        error: "Google Sign-In isn't configured yet. Set GOOGLE_CLIENT_ID in the backend .env.",
        code: "GOOGLE_NOT_CONFIGURED",
      });
    }

    const { idToken, role } = req.body;
    const profile = await googleAuth.verifyGoogleToken(idToken);

    let user = await User.findOne({ $or: [{ googleId: profile.googleId }, { email: profile.email.toLowerCase() }] });

    if (!user) {
      user = new User({
        name: profile.name,
        email: profile.email,
        googleId: profile.googleId,
        authProvider: "google",
        role: role || "User",
        isVerified: profile.emailVerified,
      });
      await user.save();
    } else if (!user.googleId) {
      // Existing local account signing in with Google for the first time — link it.
      user.googleId = profile.googleId;
      if (profile.emailVerified) user.isVerified = true;
      await user.save();
    }

    if (!user.isActive) {
      return res.status(403).json({ error: "This account has been suspended. Contact support for help.", code: "ACCOUNT_SUSPENDED" });
    }

    const token = makeToken(user);
    setAuthCookie(res, token);
    res.json({ token, user: user.toSafeJSON() });
  } catch (err) {
    logger.error({ err }, "Google auth error");
    res.status(401).json({ error: "Google sign-in failed. Please try again.", code: "GOOGLE_AUTH_FAILED" });
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

// POST /api/auth/logout — clears the httpOnly cookie (JSON-token clients
// just discard their local copy; nothing server-side to invalidate since
// tokens are stateless JWTs).
router.post("/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ message: "Logged out." });
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

    const { sent, verifyUrl } = await email.sendVerificationEmail(user, user.verifyToken);
    if (!sent && isDev) logger.info(`Verification link for ${user.email}: ${verifyUrl}`);

    res.json({ message: "Verification email resent.", ...(isDev && !sent && { devVerifyUrl: verifyUrl }) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/forgot-password
router.post("/forgot-password", forgotPasswordLimiter, validate(forgotPasswordSchema), async (req, res) => {
  try {
    const { email: emailAddr } = req.body;

    const genericResponse = { message: "If an account exists for that email, a reset link has been sent." };
    const user = await User.findOne({ email: emailAddr.toLowerCase().trim() });

    // Always respond the same way whether or not the account exists,
    // to avoid leaking which emails are registered.
    if (!user) return res.json(genericResponse);

    user.resetToken = crypto.randomBytes(32).toString("hex");
    user.resetTokenExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 min
    await user.save();

    const { sent, resetUrl } = await email.sendPasswordResetEmail(user, user.resetToken);
    if (!sent && isDev) logger.info(`Password reset link for ${user.email}: ${resetUrl}`);

    res.json({ ...genericResponse, ...(isDev && !sent && { devResetUrl: resetUrl }) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/reset-password
router.post("/reset-password", validate(resetPasswordSchema), async (req, res) => {
  try {
    const { token, newPassword } = req.body;

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
