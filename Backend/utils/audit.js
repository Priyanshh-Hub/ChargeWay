const AuditLog = require("../models/AuditLog");
const logger = require("./logger");

async function logAudit({ actor, action, targetType, targetId, details }) {
  try {
    let actorName = actor.name;
    if (!actorName) {
      // req.user from the JWT only carries {id, role} — look up the name
      // for a readable log. Audit writes are infrequent, so this is fine.
      const User = require("../models/User");
      const u = await User.findById(actor.id || actor._id).select("name");
      actorName = u?.name || "Unknown";
    }
    await AuditLog.create({
      actorId: actor.id || actor._id,
      actorName,
      actorRole: actor.role,
      action, targetType, targetId, details,
    });
  } catch (e) {
    logger.warn({ e }, "Failed to write audit log (non-blocking)");
  }
}

module.exports = { logAudit };
