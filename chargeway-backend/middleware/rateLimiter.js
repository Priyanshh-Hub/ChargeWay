/**
 * Minimal in-memory rate limiter.
 * Good enough for a single-process demo/dev deployment. If you scale to
 * multiple instances, swap the Map for a shared store (e.g. Redis).
 */
const buckets = new Map(); // key -> { count, firstAttempt }

function makeLimiter({ windowMs, max, keyFn }) {
  return (req, res, next) => {
    const key = keyFn(req);
    const now = Date.now();
    const entry = buckets.get(key);

    if (!entry || now - entry.firstAttempt > windowMs) {
      buckets.set(key, { count: 1, firstAttempt: now });
      return next();
    }

    entry.count += 1;
    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.firstAttempt + windowMs - now) / 1000);
      res.set("Retry-After", String(retryAfter));
      return res.status(429).json({
        error: `Too many attempts. Try again in ${retryAfter}s.`,
        retryAfter,
      });
    }
    next();
  };
}

// Call after a successful login to forgive prior failed attempts for that key.
function clearBucket(key) {
  buckets.delete(key);
}

const loginKey = (req) => `login:${req.ip}:${String(req.body?.email || "").toLowerCase()}`;

const loginLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 8,
  keyFn: loginKey,
});

const forgotPasswordLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyFn: (req) => `forgot:${req.ip}:${String(req.body?.email || "").toLowerCase()}`,
});

// Periodically sweep old entries so the Map doesn't grow forever.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of buckets.entries()) {
    if (now - entry.firstAttempt > 60 * 60 * 1000) buckets.delete(key);
  }
}, 30 * 60 * 1000).unref?.();

module.exports = { makeLimiter, loginLimiter, forgotPasswordLimiter, clearBucket, loginKey };
