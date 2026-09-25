import admin from "./index.js";

// FCM error codes that mean the token will never work again.
const INVALID_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

export const isInvalidTokenError = (error) =>
  INVALID_TOKEN_CODES.has(error?.code || error?.errorInfo?.code);

const buildMessage = (token, title, body, data = {}) => ({
  token,
  notification: { title, body },
  // FCM data values must all be strings.
  data: Object.fromEntries(
    Object.entries(data || {}).map(([key, value]) => [key, String(value)])
  ),
});

/**
 * Sends a push and THROWS on failure, so callers (e.g. the RabbitMQ consumer)
 * can decide whether to retry, drop, or clean up a dead token.
 * Returns null when Firebase Admin isn't configured.
 */
export const deliverNotification = async (token, title, body, data = {}) => {
  if (!admin) {
    console.log("ℹ️ Push notification skipped (Firebase Admin not initialized).");
    return null;
  }
  return admin.messaging().send(buildMessage(token, title, body, data));
};

/**
 * Fire-and-forget variant for callers that don't care about the outcome.
 * Never throws.
 */
export const sendNotification = async (token, title, body, data = {}) => {
  try {
    return await deliverNotification(token, title, body, data);
  } catch (error) {
    console.error("❌ Error sending notification:", error?.code || error?.message || error);
    return null;
  }
};
