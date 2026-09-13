/**
 * Transactional email — verification & password reset.
 *
 * Lazily builds a Nodemailer transporter so a missing SMTP config doesn't
 * crash the server at boot (same pattern as the Razorpay client in
 * routes/payments.js). Without SMTP_HOST/SMTP_USER/SMTP_PASS set, this
 * silently falls back to the old behaviour: log the link to the console
 * and return it in the API response (dev-only) — nothing breaks, emails
 * just aren't actually sent yet.
 *
 * To go live: set these in Backend/.env (see .env.example):
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM, APP_URL
 * Any SMTP provider works — Gmail (app password), Resend, SendGrid,
 * Mailgun, Amazon SES all expose SMTP credentials.
 */
const nodemailer = require("nodemailer");

let transporter = null;
let triedInit = false;

function getTransporter() {
  if (triedInit) return transporter;
  triedInit = true;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

const isConfigured = () => !!getTransporter();

const appUrl = () => process.env.APP_URL || "http://localhost:5173";
const fromAddress = () => process.env.EMAIL_FROM || "ChargeWay <no-reply@chargeway.app>";

async function sendMail({ to, subject, html }) {
  const client = getTransporter();
  if (!client) return { sent: false, reason: "SMTP not configured" };
  await client.sendMail({ from: fromAddress(), to, subject, html });
  return { sent: true };
}

function baseTemplate(title, bodyHtml) {
  return `
  <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color:#0f172a;">
    <h2 style="margin:0 0 16px;">⚡ ChargeWay</h2>
    <h3 style="margin:0 0 12px;">${title}</h3>
    ${bodyHtml}
    <p style="margin-top:32px; font-size:12px; color:#64748b;">If you didn't request this, you can safely ignore this email.</p>
  </div>`;
}

async function sendVerificationEmail(user, verifyToken) {
  const verifyUrl = `${appUrl()}/verify-email/${verifyToken}`;
  const result = await sendMail({
    to: user.email,
    subject: "Verify your ChargeWay account",
    html: baseTemplate(
      "Confirm your email",
      `<p>Hi ${user.name}, click below to verify your ChargeWay account:</p>
       <p><a href="${verifyUrl}" style="display:inline-block;background:#22c55e;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;">Verify Email</a></p>
       <p style="font-size:13px;color:#64748b;">This link expires in 24 hours.</p>`
    ),
  });
  return { ...result, verifyUrl };
}

async function sendPasswordResetEmail(user, resetToken) {
  const resetUrl = `${appUrl()}/reset-password/${resetToken}`;
  const result = await sendMail({
    to: user.email,
    subject: "Reset your ChargeWay password",
    html: baseTemplate(
      "Reset your password",
      `<p>Hi ${user.name}, click below to set a new password:</p>
       <p><a href="${resetUrl}" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;">Reset Password</a></p>
       <p style="font-size:13px;color:#64748b;">This link expires in 30 minutes. If you didn't request this, your account is still safe — no action needed.</p>`
    ),
  });
  return { ...result, resetUrl };
}

module.exports = { isConfigured, sendMail, sendVerificationEmail, sendPasswordResetEmail };
