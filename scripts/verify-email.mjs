/**
 * Verifies the SMTP transport used for OTP / password reset / notifications.
 *
 * Usage:
 *   node scripts/verify-email.mjs                 # connection + auth check only
 *   node scripts/verify-email.mjs you@example.com # also sends a test message
 */
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const host = process.env.EMAIL_HOST || process.env.SMTP_HOST;
const port = Number(process.env.EMAIL_PORT || process.env.SMTP_PORT || 465);
const secure = (process.env.EMAIL_SECURE || "true") !== "false";
const user = process.env.EMAIL_USER || process.env.SMTP_USER;
const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;

if (!host || !user || !pass) {
  console.error("[verify-email] EMAIL_HOST / EMAIL_USER / EMAIL_PASS are not fully set.");
  process.exit(1);
}

console.log(`[verify-email] Connecting to ${host}:${port} (secure=${secure}) as ${user} ...`);

const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });

try {
  await transporter.verify();
  console.log("[verify-email] PASS  SMTP connection and authentication succeeded.");
} catch (error) {
  console.error("[verify-email] FAIL  SMTP auth/connection failed:", error.message);
  console.error(
    "\nHostinger frequently rejects logins when:\n" +
      "  - the mailbox password is wrong or was rotated,\n" +
      "  - the sending domain's DNS (SPF/DKIM) is not set up, or\n" +
      "  - outbound SMTP is restricted for the account.\n" +
      "Verify the password in hPanel > Emails, and consider an app password.",
  );
  process.exit(1);
}

const to = process.argv[2];
if (to) {
  const info = await transporter.sendMail({
    from: `"MiCita" <${process.env.EMAIL_FROM || user}>`,
    to,
    subject: "MiCita SMTP test",
    text: "If you received this, the SMTP transport works.",
  });
  console.log(`[verify-email] Test message sent to ${to} (messageId=${info.messageId}).`);
} else {
  console.log("[verify-email] Pass an email address to also send a test message.");
}
