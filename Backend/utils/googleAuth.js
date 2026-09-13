/**
 * Google Sign-In — verifies the ID token the frontend gets from Google's
 * client-side button, using google-auth-library.
 *
 * Needs GOOGLE_CLIENT_ID set in Backend/.env (same value the frontend uses
 * as VITE_GOOGLE_CLIENT_ID — create one at console.cloud.google.com →
 * APIs & Services → Credentials → OAuth Client ID → Web application).
 * Without it, /api/auth/google returns a clear "not configured" error
 * instead of crashing.
 */
const { OAuth2Client } = require("google-auth-library");

let client = null;
function getClient() {
  if (client) return client;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return null;
  client = new OAuth2Client(clientId);
  return client;
}

const isConfigured = () => !!process.env.GOOGLE_CLIENT_ID;

/**
 * Verifies a Google ID token and returns { email, name, googleId, emailVerified }.
 * Throws if the token is invalid/expired.
 */
async function verifyGoogleToken(idToken) {
  const c = getClient();
  if (!c) throw new Error("Google login isn't configured on the server yet.");

  const ticket = await c.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  return {
    email: payload.email,
    name: payload.name || payload.email.split("@")[0],
    googleId: payload.sub,
    emailVerified: !!payload.email_verified,
  };
}

module.exports = { isConfigured, verifyGoogleToken };
