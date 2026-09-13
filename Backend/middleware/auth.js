const jwt = require("jsonwebtoken");

// A real secret must come from the environment — this fallback exists only
// so local dev doesn't crash if .env is momentarily missing one line. In
// production, using this well-known string would let anyone on the internet
// forge a valid JWT (including one claiming role: "Admin") since the value
// is sitting in the source code. server.js refuses to boot in production
// unless JWT_SECRET is set to something other than this default — see the
// startup check there.
const DEFAULT_DEV_SECRET = "chargeway_secret_change_in_production";
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_DEV_SECRET;

const verifyToken = (req, res, next) => {
  const header = req.headers.authorization;
  // Accept either the Authorization header (existing clients) or the
  // httpOnly cookie set by routes/auth.js (cw_token) — whichever is present.
  const token = header ? header.split(" ")[1] : req.cookies?.cw_token;
  if (!token) return res.status(401).json({ error: "No token provided" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: "Access denied" });
  }
  next();
};

// Like verifyToken, but never rejects — attaches req.user if a valid
// token is present, otherwise leaves it undefined and continues. Used on
// routes that are genuinely public (station discovery) but still need to
// behave differently for a logged-in Station Manager/Admin viewing their
// own not-yet-approved listing vs. an anonymous rider who shouldn't see it.
const optionalAuth = (req, res, next) => {
  const header = req.headers.authorization;
  const token = header ? header.split(" ")[1] : req.cookies?.cw_token;
  if (!token) return next();
  try {
    req.user = jwt.verify(token, JWT_SECRET);
  } catch {
    // Invalid/expired token on a public route — treat as anonymous rather
    // than erroring, since the route works fine without auth too.
  }
  next();
};

module.exports = { verifyToken, requireRole, optionalAuth, JWT_SECRET, DEFAULT_DEV_SECRET };
