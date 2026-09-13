/**
 * Rate limiter — Redis-backed when REDIS_URL is set (needed for any
 * multi-instance deployment, since an in-memory Map doesn't share state
 * across processes), otherwise falls back to in-memory automatically.
 *
 * To go multi-instance: set REDIS_URL in .env (e.g. from Upstash, Redis
 * Cloud, or a self-hosted instance) and `npm install ioredis`.
 */
const { RateLimiterMemory, RateLimiterRedis } = require("rate-limiter-flexible");

let redisClient = null;
function buildLimiter({ keyPrefix, points, duration }) {
  if (process.env.REDIS_URL) {
    try {
      if (!redisClient) {
        // Lazy require so Redis isn't a hard dependency when unused.
        const IORedis = require("ioredis");
        redisClient = new IORedis(process.env.REDIS_URL);
        redisClient.on("error", (e) => console.error("Redis error:", e.message));
      }
      return new RateLimiterRedis({ storeClient: redisClient, keyPrefix, points, duration });
    } catch (e) {
      console.warn("REDIS_URL set but Redis unavailable, falling back to in-memory limiter:", e.message);
    }
  }
  return new RateLimiterMemory({ keyPrefix, points, duration });
}

const loginKey = (req) => `${req.ip}:${String(req.body?.email || "").toLowerCase()}`;
const forgotKey = (req) => `${req.ip}:${String(req.body?.email || "").toLowerCase()}`;

const loginRL = buildLimiter({ keyPrefix: "login", points: 8, duration: 15 * 60 });
const forgotRL = buildLimiter({ keyPrefix: "forgot", points: 5, duration: 15 * 60 });
const bookingRL = buildLimiter({ keyPrefix: "booking", points: 10, duration: 10 * 60 }); // 10 attempts / 10 min
const reviewRL = buildLimiter({ keyPrefix: "review", points: 5, duration: 10 * 60 });   // 5 attempts / 10 min

function makeMiddleware(limiter, keyFn) {
  return async (req, res, next) => {
    const key = keyFn(req);
    try {
      await limiter.consume(key);
      next();
    } catch (rlRejected) {
      const retryAfter = Math.ceil((rlRejected.msBeforeNext || 1000) / 1000);
      res.set("Retry-After", String(retryAfter));
      return res.status(429).json({
        error: `Too many attempts. Try again in ${retryAfter}s.`,
        retryAfter,
      });
    }
  };
}

// Call after a successful login to forgive prior failed attempts for that key.
async function clearBucket(key) {
  try { await loginRL.delete(key); } catch { /* ignore */ }
}

const loginLimiter = makeMiddleware(loginRL, loginKey);
const forgotPasswordLimiter = makeMiddleware(forgotRL, forgotKey);
const bookingLimiter = makeMiddleware(bookingRL, (req) => req.user.id);
const reviewLimiter  = makeMiddleware(reviewRL,  (req) => req.user.id);

module.exports = { loginLimiter, forgotPasswordLimiter, bookingLimiter, reviewLimiter, clearBucket, loginKey };
