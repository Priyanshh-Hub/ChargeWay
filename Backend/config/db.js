const mongoose = require("mongoose");
const logger = require("../utils/logger");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/chargeway";

// Previously this used Mongoose's default 30s serverSelectionTimeout with
// no retry — meaning a slow/misconfigured DB (wrong URI, an Atlas cluster
// still waking up, IP not whitelisted) made the ENTIRE server hang for up
// to 30 seconds before hard-exiting, since server.js waits on this promise
// before calling app.listen(). Nothing responded — not even /api/health —
// for the whole 30s. Fixed: fail fast (5s) and retry with backoff instead
// of crashing the process on the first hiccup.
const connectDB = async (retries = 5, delayMs = 3000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 5000, // fail fast instead of the 30s default
      });
      logger.info(`MongoDB connected: ${MONGO_URI}`);
      await repairGoogleIdIndex();
      await repairLegacyStationApprovalStatus();
      return;
    } catch (err) {
      logger.error(`MongoDB connection attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt === retries) {
        logger.error("MongoDB unreachable after all retries. Check MONGO_URI in .env — see .env.example.");
        throw err;
      }
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
};

// One-time self-healing migration, run on every successful connect (cheap
// no-op once the data is clean). Fixes a real bug: the User schema used
// to set `googleId: null` by default on every email/password account. A
// sparse unique index only skips a field that's truly ABSENT, not one
// that's present-and-null — so the first non-Google signup was fine and
// every one after it failed registration outright with a raw Mongo
// E11000 duplicate-key error. This:
//   1. Unsets googleId on any account where it's literally null, so the
//      field goes back to being absent (what the fixed schema intends).
//   2. Rebuilds the users collection's indexes from the current schema —
//      if the real index in MongoDB was created before `sparse: true`
//      ever existed, editing the schema alone doesn't retroactively fix
//      it; the index itself has to be dropped and recreated.
// Wrapped in try/catch and never throws — a failed repair shouldn't take
// the whole server down; worst case registration keeps failing as before
// and this logs why.
async function repairGoogleIdIndex() {
  try {
    const User = require("../models/User");
    const { modifiedCount } = await User.updateMany({ googleId: null }, { $unset: { googleId: "" } });
    if (modifiedCount > 0) {
      logger.info(`Repaired ${modifiedCount} account(s) with googleId: null (see config/db.js repairGoogleIdIndex).`);
    }
    await User.syncIndexes();
  } catch (err) {
    logger.warn({ err }, "googleId index repair failed — registration may still error if the index is stale. Safe to ignore if this is a brand-new database.");
  }
}

// Every station created before the partner-approval system existed (see
// models/Station.js approvalStatus) has NO such field in its stored
// document at all — a schema default never retroactively applies to old
// documents. routes/stations.js now treats "field is missing" the same
// as "Approved" as a safety net, but that's a patch over the real data
// gap; this backfills the field explicitly so every station's approval
// state is unambiguous going forward (matters for the admin Partner
// Applications queue, analytics, etc., not just rider-facing visibility).
async function repairLegacyStationApprovalStatus() {
  try {
    const Station = require("../models/Station");
    const { modifiedCount } = await Station.updateMany(
      { approvalStatus: { $exists: false } },
      { $set: { approvalStatus: "Approved" } }
    );
    if (modifiedCount > 0) {
      logger.info(`Backfilled approvalStatus: "Approved" on ${modifiedCount} pre-existing station(s).`);
    }
  } catch (err) {
    logger.warn({ err }, "Legacy station approvalStatus backfill failed — stations should still be visible via the fallback filter in routes/stations.js.");
  }
}

module.exports = { connectDB, MONGO_URI };
