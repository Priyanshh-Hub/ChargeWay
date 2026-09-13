const Notification = require("../models/Notification");
const logger = require("./logger");

// Fire-and-forget: never let a notification failure break the request
// that triggered it.
async function createNotification(userId, type, message, bookingId = null) {
  try {
    await Notification.create({ userId, type, message, bookingId });
  } catch (e) {
    logger.warn({ e }, "Failed to create notification (non-blocking)");
  }
}

module.exports = { createNotification };
