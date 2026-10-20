/**
 * End-to-end smoke test for the cancellation waitlist (Phase 7).
 *
 * Booking cancelled → matching waitlist entry gets WhatsApp → claim link →
 * replacement appointment. Also covers duplicate claims and owner list.
 *
 * Usage:  node scripts/smoke-waitlist.mjs   (server must be running on :5000)
 */
import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config();

const BASE = process.env.SMOKE_BASE_URL || "http://localhost:5000";
const EMAIL = process.env.SMOKE_EMAIL || "demo@micita.pe";
const PASSWORD = process.env.SMOKE_PASSWORD || "DemoMiCita2026!";
const UNIQUE = Date.now().toString().slice(-7);
const PHONE_BOOKED = `+5184${UNIQUE}`;
const PHONE_WAIT = `+5183${UNIQUE}`;

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
let bookedAppointmentId = null;
let bookedClientId = null;
let bookedToken = null;
let waitlistEntryId = null;
let waitlistToken = null;
let claimedAppointmentId = null;
let claimedClientId = null;

function limaDate(value) {
  return value.toLocaleDateString("en-CA", { timeZone: "America/Lima" });
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
    body: JSON.stringify(body ?? {}),
  });
  const payload = await res.json().catch(() => null);
  return { status: res.status, payload };
}

async function cleanup() {
  try {
    if (waitlistEntryId) {
      await sql`DELETE FROM whatsapp_messages WHERE payload->>'waitlistEntryId' = ${String(waitlistEntryId)}`;
      await sql`DELETE FROM waitlist_entries WHERE id = ${waitlistEntryId}`;
    }
    for (const id of [claimedAppointmentId, bookedAppointmentId]) {
      if (!id) continue;
      await sql`DELETE FROM whatsapp_messages WHERE payload->>'appointmentId' = ${String(id)}`;
      await sql`DELETE FROM appointments WHERE id = ${id}`;
    }
    for (const id of [claimedClientId, bookedClientId]) {
      if (id) await sql`DELETE FROM clients WHERE id = ${id}`;
    }
    await sql`DELETE FROM clients WHERE phone = ${PHONE_BOOKED} OR phone = ${PHONE_WAIT}`;
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
  "settings expose waitlist configuration",
  settingsResponse.status === 200 &&
    typeof initialSettings?.waitlistEnabled === "boolean" &&
    typeof initialSettings?.waitlistNotifyLimit === "number",
);

const WAITLIST_TEMPLATE = "WL {nombre} · {negocio} · {servicio} · {fecha} {hora} · {link}";
const configured = await api(`/api/dashboard/businesses/${businessId}/desk-settings`, "PUT", {
  ...initialSettings,
  waitlistEnabled: true,
  showWaitlistOnMicrosite: true,
  waitlistNotifyLimit: 3,
  waitlistMessageTemplate: WAITLIST_TEMPLATE,
  depositEnabled: false,
});
check(
  "owner saves waitlist configuration",
  configured.status === 200 &&
    configured.payload?.waitlistEnabled === true &&
    configured.payload?.waitlistNotifyLimit === 3 &&
    configured.payload?.waitlistMessageTemplate === WAITLIST_TEMPLATE,
);

try {
  const date = limaDate(new Date(Date.now() + 20 * 86_400_000));
  const [bookedClient] = await sql`
    INSERT INTO clients (business_id, name, phone)
    VALUES (${businessId}, 'Smoke Booked', ${PHONE_BOOKED})
    RETURNING id
  `;
  bookedClientId = bookedClient.id;
  bookedToken = `smoke-waitlist-${UNIQUE}-booked`;

  const [booked] = await sql`
    INSERT INTO appointments
      (business_id, client_id, service_id, date, time, duration, status, price, source, cancel_token)
    VALUES
      (${businessId}, ${bookedClient.id}, ${service?.id}, ${date}, '10:00', 30,
       'confirmed', '25.00', 'booking', ${bookedToken})
    RETURNING id
  `;
  bookedAppointmentId = booked.id;
  check("booked appointment fixture", Boolean(bookedAppointmentId), `${date} 10:00`);


  const joined = await publicPost(`/api/public/waitlist/${businessId}`, {
    serviceId: service?.id,
    date,
    name: "Smoke Wait",
    phone: PHONE_WAIT,
  });
  waitlistEntryId = joined.payload?.entry?.id ?? null;
  waitlistToken = joined.payload?.entry?.token ?? null;
  check(
    "customer joins the waitlist",
    joined.status === 201 &&
      Boolean(waitlistEntryId) &&
      joined.payload?.position === 1 &&
      joined.payload?.entry?.status === "waiting",
    `entry ${waitlistEntryId} · position ${joined.payload?.position}`,
  );

  const duplicateJoin = await publicPost(`/api/public/waitlist/${businessId}`, {
    serviceId: service?.id,
    date,
    name: "Smoke Wait",
    phone: PHONE_WAIT,
  });
  check(
    "joining twice is idempotent",
    duplicateJoin.status === 200 &&
      duplicateJoin.payload?.alreadyJoined === true &&
      duplicateJoin.payload?.entry?.id === waitlistEntryId,
  );

  const ownerList = await api(`/api/dashboard/businesses/${businessId}/waitlist`);
  const ownerEntry = ownerList.payload?.entries?.find((entry) => entry.id === waitlistEntryId);
  check(
    "owner sees the waiting customer",
    ownerList.status === 200 &&
      ownerList.payload?.count >= 1 &&
      ownerEntry?.status === "waiting" &&
      ownerEntry?.serviceName,
    ownerEntry?.serviceName ?? "missing",
  );

  const cancelled = await publicPost(`/api/public/appointments/${bookedToken}/cancel`, {});
  check(
    "booked appointment is cancelled",
    cancelled.status === 200 && cancelled.payload?.appointment?.status === "cancelled",
    cancelled.payload?.appointment?.status ?? "no status",
  );

  let slotMessage = null;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    const [message] = await sql`
      SELECT text, status FROM whatsapp_messages
      WHERE payload->>'waitlistEntryId' = ${String(waitlistEntryId)}
        AND payload->>'type' = 'waitlist_slot'
      ORDER BY id DESC LIMIT 1
    `;
    if (message) {
      slotMessage = message;
      break;
    }
  }
  check(
    "freed slot triggers a waitlist WhatsApp",
    Boolean(slotMessage) &&
      String(slotMessage.text).includes("WL Smoke Wait") &&
      String(slotMessage.text).includes("/lista/t/"),
    slotMessage?.status ?? "missing",
  );

  await new Promise((resolve) => setTimeout(resolve, 500));
  const [offeredEntry] = await sql`
    SELECT status, offered_date, offered_time
    FROM waitlist_entries WHERE id = ${waitlistEntryId}
  `;
  check(
    "entry is marked notified with the offer",
    offeredEntry?.status === "notified" &&
      offeredEntry?.offered_date === date &&
      offeredEntry?.offered_time === "10:00",
    `${offeredEntry?.status} · ${offeredEntry?.offered_time}`,
  );

  const claimView = await fetch(`${BASE}/api/public/waitlist/t/${waitlistToken}`);
  const claimPayload = await claimView.json().catch(() => null);
  check(
    "claim page sees the offered slot",
    claimView.ok &&
      claimPayload?.canClaim === true &&
      claimPayload?.entry?.offeredTime === "10:00" &&
      claimPayload?.service?.name === service?.name,
    claimPayload?.entry?.offeredTime ?? "missing",
  );


  const claimed = await publicPost(`/api/public/waitlist/t/${waitlistToken}/claim`, {});
  claimedAppointmentId = claimed.payload?.appointment?.id ?? null;
  check(
    "customer claims the freed slot",
    claimed.status === 201 &&
      Boolean(claimedAppointmentId) &&
      claimed.payload?.appointment?.status === "confirmed" &&
      claimed.payload?.appointment?.source === "waitlist" &&
      claimed.payload?.appointment?.date === date &&
      claimed.payload?.appointment?.time === "10:00",
    `appointment ${claimedAppointmentId}`,
  );

  const [claimedRow] = await sql`
    SELECT status, appointment_id FROM waitlist_entries WHERE id = ${waitlistEntryId}
  `;
  check(
    "entry is marked claimed",
    claimedRow?.status === "claimed" && Number(claimedRow?.appointment_id) === claimedAppointmentId,
  );

  const repeatClaim = await publicPost(`/api/public/waitlist/t/${waitlistToken}/claim`, {});
  check("the same link cannot claim twice", repeatClaim.status === 409, `status ${repeatClaim.status}`);

  const ownerAfter = await api(`/api/dashboard/businesses/${businessId}/waitlist`);
  check(
    "claimed entry leaves the active owner list",
    ownerAfter.status === 200 &&
      !ownerAfter.payload?.entries?.some((entry) => entry.id === waitlistEntryId),
  );

  const restored = await api(`/api/dashboard/businesses/${businessId}/desk-settings`, "PUT", initialSettings);
  check(
    "owner can restore the original settings",
    restored.status === 200 && restored.payload?.waitlistEnabled === initialSettings.waitlistEnabled,
  );
} finally {
  await cleanup();
  await sql.end();
}

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
