/**
 * Formatika WhatsApp gateway contract check.
 *
 * Safe by default: verifies the gateway is reachable and that unauthenticated
 * sends are rejected without sending any WhatsApp message. Pass `--send` with
 * WHATSAPP_TEST_TO=<digits> to perform one real test send.
 *
 * Usage:
 *   npm run whatsapp:check
 *   npm run whatsapp:check -- --send
 */
import dotenv from "dotenv";

dotenv.config();

const base = (
  process.env.FORMATIKA_BASE_URL ||
  process.env.FORMATIKA_API_URL ||
  "https://msg.formatika.dev"
).replace(/\/$/, "");
const apiKey = process.env.FORMATIKA_API_KEY || "";
const botNumber = (process.env.WHATSAPP_BOT_NUMBER || "").replace(/\D/g, "");
const webhookSecret = process.env.FORMATIKA_WEBHOOK_SECRET || "";
const appUrl = process.env.APP_URL || "";
const testTo = (process.env.WHATSAPP_TEST_TO || "").replace(/\D/g, "");
const shouldSend = process.argv.includes("--send");

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

console.log(`Gateway: ${base}\n`);

check("FORMATIKA_API_KEY configured", Boolean(apiKey), apiKey ? "present" : "missing");
check("WHATSAPP_BOT_NUMBER configured", /^\d{10,15}$/.test(botNumber), botNumber || "missing");
check("FORMATIKA_WEBHOOK_SECRET configured", Boolean(webhookSecret), webhookSecret ? "present" : "missing");
check("APP_URL points to a public https origin", /^https:\/\//i.test(appUrl), appUrl || "missing");

const unauthorized = await fetch(`${base}/api/send`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ to: "51999999999", text: "contract check — not sent" }),
});
const unauthorizedPayload = await unauthorized.json().catch(() => null);
check(
  "unauthenticated send is rejected with a JSON error",
  unauthorized.status === 401 &&
    typeof unauthorizedPayload?.error === "string" &&
    typeof unauthorizedPayload?.message === "string",
  `status ${unauthorized.status} · ${unauthorizedPayload?.error ?? "no error"}`,
);

if (!apiKey) {
  console.log("\nAdd FORMATIKA_API_KEY to validate authenticated sends.");
} else {
  // Empty payload validates the key without sending any WhatsApp message:
  // a valid key reaches validation (400 invalid_phone), an invalid one is 401.
  const keyCheck = await fetch(`${base}/api/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
    signal: AbortSignal.timeout(15_000),
  });
  const keyPayload = await keyCheck.json().catch(() => null);
  check(
    "Formatika API key is recognized (no message sent)",
    keyCheck.status === 400 && keyPayload?.error === "invalid_phone",
    `status ${keyCheck.status} · ${keyPayload?.error ?? "no error"}`,
  );
}

if (!apiKey) {
  // Already reported above.
} else if (!shouldSend) {
  console.log("\nAPI key present. Run with `--send` and WHATSAPP_TEST_TO=51… for one real test message.");
} else if (!testTo) {
  check("WHATSAPP_TEST_TO set for --send", false, "missing");
} else {
  const response = await fetch(`${base}/api/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: testTo,
      text: `Prueba de MiCita ✅ ${new Date().toISOString()}`,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => null);
  check(
    "authenticated send accepted by Formatika",
    response.ok && payload?.ok !== false && payload?.success !== false,
    `status ${response.status} · ${JSON.stringify(payload)?.slice(0, 140)}`,
  );
}

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exitCode = failed.length === 0 ? 0 : 1;
