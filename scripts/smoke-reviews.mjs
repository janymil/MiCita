/**
 * End-to-end smoke test for post-service review requests (Phase 6).
 *
 * Completed visit → WhatsApp review link → customer submits stars/comment →
 * owner moderation list. Also checks idempotent sends and duplicate submission.
 *
 * Usage:  node scripts/smoke-reviews.mjs   (server must be running on :5000)
 */
import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config();

const BASE = process.env.SMOKE_BASE_URL || "http://localhost:5000";
const EMAIL = process.env.SMOKE_EMAIL || "demo@micita.pe";
const PASSWORD = process.env.SMOKE_PASSWORD || "DemoMiCita2026!";
const UNIQUE = Date.now().toString().slice(-7);
const PHONE = `+5185${UNIQUE}`;
const CLIENT_EMAIL = `smoke-review-${UNIQUE}@example.test`;

const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  ssl: /neon\.tech/.test(process.env.DATABASE_URL) ? { rejectUnauthorized: false } : undefined,
});

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

let token = "";
let csrfToken = "";
let businessId = null;
let initialSettings = null;
let appointmentId = null;
let clientId = null;
let reviewToken = null;

function limaDate(value) {
  return value.toLocaleDateString("en-CA", { timeZone: "America/Lima" });
}
function limaTime(value) {
  return value.toLocaleTimeString("en-GB", {
    timeZone: "America/Lima",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

async function api(path, method = "GET", body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const payload = await res.json().catch(() => null);
  return { status: res.status, payload };
}

async function publicPost(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `micita_csrf=${csrfToken}`,
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify(body),
  });
  const payload = await res.json().catch(() => null);
  return { status: res.status, payload };
}

async function cleanup() {
  try {
    if (appointmentId) {
      await sql`DELETE FROM reviews WHERE appointment_id = ${appointmentId}`;
      await sql`DELETE FROM whatsapp_messages WHERE payload->>'appointmentId' = ${String(appointmentId)}`;
      await sql`DELETE FROM appointments WHERE id = ${appointmentId}`;
    }
    if (clientId) await sql`DELETE FROM clients WHERE id = ${clientId}`;
    if (initialSettings && businessId) {
      await sql`
        UPDATE business_settings
        SET desk_settings = ${sql.json(initialSettings)}
        WHERE business_id = ${businessId}
      `;
    }
  } catch (error) {
    console.error("cleanup failed:", error);
  }
}

// Double-submit CSRF: any GET issues the cookie, login must echo it.
const bootstrap = await fetch(`${BASE}/api/health`);
for (const cookie of bootstrap.headers.getSetCookie()) {
  const match = cookie.match(/micita_csrf=([^;]+)/);
  if (match) csrfToken = decodeURIComponent(match[1]);
}

const login = await fetch(`${BASE}/api/auth/login`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Cookie: `micita_csrf=${csrfToken}`,
    "x-csrf-token": csrfToken,
  },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
const loginPayload = await login.json().catch(() => null);
token = loginPayload?.accessToken ?? "";
check("login", login.ok && Boolean(token), `status ${login.status}`);

const businesses = await api("/api/dashboard/businesses");
businessId = businesses.payload?.[0]?.id ?? null;
check("business list", businesses.status === 200 && Boolean(businessId), `business ${businessId}`);

const services = await api(`/api/dashboard/businesses/${businessId}/services`);
const service = services.payload?.[0];
check("service available", services.status === 200 && Boolean(service), service?.name ?? "none");

const settingsResponse = await api(`/api/dashboard/businesses/${businessId}/desk-settings`);
initialSettings = settingsResponse.payload;
check(
  "settings expose review configuration",
  settingsResponse.status === 200 &&
    typeof initialSettings?.reviewRequestsEnabled === "boolean" &&
    typeof initialSettings?.reviewDelayMinutes === "number",
);

const REVIEW_TEMPLATE = "REV {nombre} · {negocio} · {servicio} · {link}";

const configured = await api(`/api/dashboard/businesses/${businessId}/desk-settings`, "PUT", {
  ...initialSettings,
  reviewRequestsEnabled: true,
  reviewDelayMinutes: 0,
  reviewMessageTemplate: REVIEW_TEMPLATE,
});
check(
  "owner saves review automation config",
  configured.status === 200 &&
    configured.payload?.reviewRequestsEnabled === true &&
    configured.payload?.reviewDelayMinutes === 0 &&
    configured.payload?.reviewMessageTemplate === REVIEW_TEMPLATE,
);

try {
  reviewToken = `smoke-review-${UNIQUE}-token`;
  const [client] = await sql`
    INSERT INTO clients (business_id, name, phone, email)
    VALUES (${businessId}, 'Smoke Review', ${PHONE}, ${CLIENT_EMAIL})
    RETURNING id
  `;
  clientId = client.id;

  const [appointment] = await sql`
    INSERT INTO appointments
      (business_id, client_id, service_id, date, time, duration, status, price, source,
       completed_at, cancel_token)
    VALUES
      (${businessId}, ${client.id}, ${service?.id}, ${limaDate(new Date())}, ${limaTime(new Date())},
       30, 'completed', '25.00', 'walk_in', now(), ${reviewToken})
    RETURNING id
  `;
  appointmentId = appointment.id;
  check("completed visit fixture", Boolean(appointmentId), `appointment ${appointmentId}`);


  const pass = await api(`/api/dashboard/businesses/${businessId}/reviews/run`, "POST", {});
  check(
    "manual pass sends the review request",
    pass.status === 200 && pass.payload?.scanned >= 1,
    pass.payload
      ? `scanned ${pass.payload.scanned} · sent ${pass.payload.sent} · skipped ${pass.payload.skipped}`
      : "no summary",
  );

  const [requestMessage] = await sql`
    SELECT text, status FROM whatsapp_messages
    WHERE payload->>'appointmentId' = ${String(appointmentId)}
      AND payload->>'type' = 'review_request'
    ORDER BY id DESC LIMIT 1
  `;
  check(
    "review request contains the customer name and review link",
    Boolean(requestMessage) &&
      String(requestMessage.text).includes("REV Smoke Review") &&
      String(requestMessage.text).includes(`/review/${reviewToken}`),
    requestMessage?.status ?? "missing",
  );

  const [stamped] = await sql`
    SELECT review_request_sent_at FROM appointments WHERE id = ${appointmentId}
  `;
  check("review request is stamped on the appointment", Boolean(stamped?.review_request_sent_at));

  const secondPass = await api(`/api/dashboard/businesses/${businessId}/reviews/run`, "POST", {});
  const [messageCount] = await sql`
    SELECT count(*)::int AS n FROM whatsapp_messages
    WHERE payload->>'appointmentId' = ${String(appointmentId)}
      AND payload->>'type' = 'review_request'
  `;
  check(
    "a second pass does not resend the request",
    secondPass.status === 200 && messageCount?.n === 1,
    `messages ${messageCount?.n}`,
  );

  const reviewView = await fetch(`${BASE}/api/public/reviews/${reviewToken}`);
  const reviewPayload = await reviewView.json().catch(() => null);
  check(
    "public review link exposes the completed visit",
    reviewView.ok &&
      reviewPayload?.canReview === true &&
      reviewPayload?.business?.name &&
      reviewPayload?.service?.name &&
      reviewPayload?.client?.name === "Smoke Review",
    reviewPayload?.business?.name ?? "no business",
  );

  const submitted = await publicPost(`/api/public/reviews/${reviewToken}`, {
    rating: 5,
    comment: "Excelente corte y atención.",
  });
  check(
    "customer submits a 5-star review",
    submitted.status === 201 &&
      submitted.payload?.review?.rating === 5 &&
      submitted.payload?.review?.source === "appointment" &&
      submitted.payload?.review?.status === "pending" &&
      Number(submitted.payload?.review?.appointmentId) === appointmentId,
    `review ${submitted.payload?.review?.id}`,
  );

  const afterSubmit = await fetch(`${BASE}/api/public/reviews/${reviewToken}`);
  const afterPayload = await afterSubmit.json().catch(() => null);
  check(
    "the same link cannot submit twice",
    afterPayload?.canReview === false &&
      afterPayload?.review?.rating === 5 &&
      afterPayload?.review?.comment === "Excelente corte y atención.",
  );

  const duplicate = await publicPost(`/api/public/reviews/${reviewToken}`, {
    rating: 4,
    comment: "Otra vez",
  });
  check("duplicate submission is rejected", duplicate.status === 409, `status ${duplicate.status}`);

  const ownerReviews = await api(`/api/dashboard/businesses/${businessId}/reviews`);
  const ownerReview = ownerReviews.payload?.reviews?.find(
    (review) => Number(review.appointmentId) === appointmentId,
  );
  check(
    "owner sees the review awaiting moderation",
    ownerReviews.status === 200 &&
      ownerReview?.rating === 5 &&
      ownerReview?.status === "pending" &&
      ownerReview?.source === "appointment",
    `status ${ownerReview?.status ?? "missing"}`,
  );

  const restored = await api(`/api/dashboard/businesses/${businessId}/desk-settings`, "PUT", initialSettings);
  check(
    "owner can restore the original settings",
    restored.status === 200 &&
      restored.payload?.reviewRequestsEnabled === initialSettings.reviewRequestsEnabled,
  );
} finally {
  await cleanup();
  await sql.end();
}

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
