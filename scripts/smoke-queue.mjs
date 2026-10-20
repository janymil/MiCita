/**
 * End-to-end smoke test for Phase 2 (virtual queue):
 * public join → owner sees the line → notify → seat → finish → ticket served.
 *
 * Usage:  node scripts/smoke-queue.mjs      (server must be running on :5000)
 */
import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config();

const BASE = process.env.SMOKE_BASE_URL || "http://localhost:5000";
const EMAIL = process.env.SMOKE_EMAIL || "demo@micita.pe";
const PASSWORD = process.env.SMOKE_PASSWORD || "DemoMiCita2026!";
const UNIQUE = Date.now().toString().slice(-7);
const CUSTOMER_NAME = "Smoke Queue";
const CUSTOMER_PHONE = `+5199${UNIQUE}`;
const EXTRA_PHONES = [`+5197${UNIQUE}`, `+5196${UNIQUE}`, `+5195${UNIQUE}`];

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
let queueToken = null;
let appointmentId = null;
let retentionAppointmentId = null;
let retentionClientPhone = null;
const extraTokens = [];

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

async function joinQueue({ name, phone, serviceId }) {
  const res = await fetch(`${BASE}/api/public/queue/${businessId}/tickets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `micita_csrf=${csrfToken}`,
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({ name, phone, serviceId }),
  });
  const payload = await res.json().catch(() => null);
  return { status: res.status, payload };
}

async function cleanup() {
  try {
    if (businessId) {
      // Queue notification logs reference the smoke tickets; remove them before
      // the tickets themselves disappear.
      await sql`
        DELETE FROM whatsapp_messages
        WHERE business_id = ${businessId}
          AND payload->>'ticketId' IN (
            SELECT id::text FROM queue_tickets
            WHERE business_id = ${businessId} AND name LIKE 'Smoke Queue%'
          )
      `;
    }
    if (appointmentId) {
      await sql`DELETE FROM service_transactions WHERE appointment_id = ${appointmentId}`;
      await sql`DELETE FROM whatsapp_messages WHERE payload->>'appointmentId' = ${String(appointmentId)}`;
      await sql`DELETE FROM loyalty_events WHERE appointment_id = ${appointmentId}`;
      await sql`DELETE FROM queue_tickets WHERE appointment_id = ${appointmentId}`;
      await sql`DELETE FROM appointments WHERE id = ${appointmentId}`;
    }
    for (const ticketToken of [queueToken, ...extraTokens].filter(Boolean)) {
      await sql`DELETE FROM queue_tickets WHERE token = ${ticketToken}`;
    }
    if (businessId) {
      await sql`DELETE FROM queue_tickets WHERE business_id = ${businessId} AND name LIKE 'Smoke Queue%'`;
      await sql`
        DELETE FROM loyalty_cards
        WHERE business_id = ${businessId}
          AND client_id IN (
            SELECT id FROM clients WHERE business_id = ${businessId} AND name LIKE 'Smoke Queue%'
          )
      `;
    }
    await sql`DELETE FROM service_transactions WHERE note IN ('queue-smoke', 'settings-smoke')`;
    if (retentionAppointmentId) {
      await sql`DELETE FROM appointments WHERE id = ${retentionAppointmentId}`;
    }
    if (retentionClientPhone) {
      await sql`DELETE FROM clients WHERE phone = ${retentionClientPhone}`;
    }
    for (const phone of [CUSTOMER_PHONE, ...EXTRA_PHONES]) {
      await sql`DELETE FROM clients WHERE phone = ${phone}`;
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

const initialSettingsResponse = await api(`/api/dashboard/businesses/${businessId}/desk-settings`);
const initialSettings = initialSettingsResponse.payload;
check(
  "desk settings load with defaults",
  initialSettingsResponse.status === 200 &&
    Array.isArray(initialSettings?.paymentMethods) &&
    initialSettings.paymentMethods.length > 0,
  `${initialSettings?.paymentMethods?.length ?? 0} methods`,
);

try {
  const snapshot = await fetch(`${BASE}/api/public/queue/${businessId}`);
  const snapshotPayload = await snapshot.json().catch(() => null);
  const service = snapshotPayload?.services?.[0];
  check(
    "public queue snapshot",
    snapshot.ok && Boolean(snapshotPayload?.business?.name) && Boolean(service),
    snapshotPayload?.business?.name ?? "no business",
  );

  // Lapsed-client fixture: one completed visit 60 days ago.
  retentionClientPhone = `+5194${UNIQUE}`;
  const [lapsedRow] = await sql`
    INSERT INTO clients (business_id, name, phone)
    VALUES (${businessId}, 'Smoke Lapsed', ${retentionClientPhone})
    RETURNING id
  `;
  const oldDate = new Date(Date.now() - 60 * 86_400_000).toISOString().slice(0, 10);
  const [lapsedAppointment] = await sql`
    INSERT INTO appointments (business_id, client_id, service_id, date, time, duration, status, price)
    VALUES (${businessId}, ${lapsedRow.id}, ${service?.id}, ${oldDate}, '10:00', 30, 'completed', '25.00')
    RETURNING id
  `;
  retentionAppointmentId = lapsedAppointment.id;

  const retention = await api(`/api/dashboard/businesses/${businessId}/retention`);
  const lapsedClient = retention.payload?.clients?.find((client) => client.name === "Smoke Lapsed");
  check(
    "retention lists clients past the window",
    retention.status === 200 && Boolean(lapsedClient),
    `days ${retention.payload?.days} · count ${retention.payload?.count}`,
  );
  check(
    "retention builds a WhatsApp link with the template",
    Boolean(lapsedClient?.whatsappUrl) &&
      decodeURIComponent(lapsedClient.whatsappUrl).includes("Smoke Lapsed"),
  );

  const join = await fetch(`${BASE}/api/public/queue/${businessId}/tickets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `micita_csrf=${csrfToken}`,
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({
      name: CUSTOMER_NAME,
      phone: CUSTOMER_PHONE,
      serviceId: service?.id,
    }),
  });
  const joinPayload = await join.json().catch(() => null);
  queueToken = joinPayload?.token ?? null;
  check(
    "public join returns position and ETA",
    join.status === 201 && Boolean(queueToken) && Number(joinPayload?.position) >= 1,
    `position ${joinPayload?.position} · ${joinPayload?.etaMinutes} min`,
  );

  const ownTicket = await fetch(`${BASE}/api/public/queue/tickets/${queueToken}`);
  const ownPayload = await ownTicket.json().catch(() => null);
  check(
    "public ticket lookup is token-scoped",
    ownTicket.ok && ownPayload?.status === "waiting" && ownPayload?.token === queueToken,
    `status ${ownPayload?.status}`,
  );

  const ownerQueue = await api(`/api/dashboard/businesses/${businessId}/queue`);
  const queueTicket = ownerQueue.payload?.tickets?.find((ticket) => ticket.id && ticket.name === CUSTOMER_NAME);
  check(
    "owner sees the waiting ticket",
    ownerQueue.status === 200 && Boolean(queueTicket),
    `waiting ${ownerQueue.payload?.waitingCount}`,
  );

  const joinedMessage = await sql`
    SELECT text, status FROM whatsapp_messages
    WHERE business_id = ${businessId}
      AND payload->>'type' = 'queue_joined'
      AND payload->>'ticketId' = ${String(queueTicket?.id ?? "")}
    ORDER BY id DESC LIMIT 1
  `;
  check(
    "join sends an automatic WhatsApp with position and ticket link",
    joinedMessage.length > 0 &&
      joinedMessage[0].text?.includes(CUSTOMER_NAME) &&
      joinedMessage[0].text?.includes(`?ticket=${queueToken}`),
    joinedMessage[0]?.status ?? "no message",
  );

  const call = await api(
    `/api/dashboard/businesses/${businessId}/queue/tickets/${queueTicket?.id}/call`,
    "POST",
    {},
  );
  check(
    "notify marks ticket and builds wa.me fallback",
    call.status === 200 && call.payload?.ticket?.status === "notified" && String(call.payload?.whatsappUrl ?? "").includes("wa.me"),
    call.payload?.whatsappUrl ? "link ok" : "no link",
  );

  const calledMessage = await sql`
    SELECT text, status FROM whatsapp_messages
    WHERE business_id = ${businessId}
      AND payload->>'type' = 'queue_called'
      AND payload->>'ticketId' = ${String(queueTicket?.id ?? "")}
    ORDER BY id DESC LIMIT 1
  `;
  check(
    "notify sends the automatic WhatsApp message",
    calledMessage.length > 0 && calledMessage[0].text?.includes(CUSTOMER_NAME),
    calledMessage[0]?.status ?? "no message",
  );

  // A second customer lets us verify the automatic "you're next" ping when the
  // first one is seated.
  const nextJoin = await joinQueue({
    name: `${CUSTOMER_NAME} Next`,
    phone: EXTRA_PHONES[0],
    serviceId: service?.id,
  });
  if (nextJoin.payload?.token) extraTokens.push(nextJoin.payload.token);
  const [nextTicketRow] = await sql`
    SELECT id FROM queue_tickets WHERE token = ${nextJoin.payload?.token ?? ""}
  `;

  const seat = await api(
    `/api/dashboard/businesses/${businessId}/queue/tickets/${queueTicket?.id}/seat`,
    "POST",
    { force: true },
  );
  appointmentId = seat.payload?.appointment?.id ?? null;
  check(
    "seat creates an in-progress appointment (source=queue)",
    seat.status === 201 && seat.payload?.appointment?.status === "in_progress" && seat.payload?.appointment?.source === "queue",
    `appointment ${appointmentId}`,
  );

  // Fire-and-forget notification: give it a moment, then check both the message
  // log and the ticket status.
  await new Promise((resolve) => setTimeout(resolve, 800));
  const nextMessage = await sql`
    SELECT text, status FROM whatsapp_messages
    WHERE business_id = ${businessId}
      AND payload->>'type' = 'queue_next'
      AND payload->>'ticketId' = ${String(nextTicketRow?.id ?? "")}
    ORDER BY id DESC LIMIT 1
  `;
  const [nextTicketAfter] = await sql`
    SELECT status FROM queue_tickets WHERE id = ${nextTicketRow?.id ?? 0}
  `;
  check(
    "seating a customer automatically pings the next one",
    nextMessage.length > 0 &&
      nextMessage[0].text?.includes(`${CUSTOMER_NAME} Next`) &&
      nextTicketAfter?.status === "notified",
    `${nextMessage[0]?.status ?? "no message"} · ${nextTicketAfter?.status ?? "no ticket"}`,
  );

  // Clear the extra ticket before later max-length assertions.
  if (nextTicketRow?.id) {
    await api(`/api/dashboard/businesses/${businessId}/queue/tickets/${nextTicketRow.id}/skip`, "POST", {});
  }

  const finish = await api(
    `/api/dashboard/businesses/${businessId}/appointments/${appointmentId}/finish`,
    "PATCH",
    { method: "yape", amount: 20, note: "queue-smoke" },
  );
  check(
    "finish completes and logs the payment",
    finish.status === 200 && finish.payload?.appointment?.status === "completed" && Boolean(finish.payload?.transaction?.id),
    `transaction ${finish.payload?.transaction?.id}`,
  );

  const served = await fetch(`${BASE}/api/public/queue/tickets/${queueToken}`);
  const servedPayload = await served.json().catch(() => null);
  check(
    "customer sees the ticket as served",
    served.ok && servedPayload?.status === "served" && servedPayload?.isActive === false,
    `status ${servedPayload?.status}`,
  );

  const qr = await fetch(`${BASE}/api/public/queue/${businessId}/qr`);
  const qrBytes = await qr.arrayBuffer();
  check(
    "QR endpoint returns a PNG",
    qr.ok && String(qr.headers.get("content-type")).includes("image/png") && qrBytes.byteLength > 1000,
    `${qrBytes.byteLength} bytes`,
  );
  // --- Owner configuration workflow ----------------------------------------
  const closedSettings = await api(`/api/dashboard/businesses/${businessId}/desk-settings`, "PUT", {
    ...initialSettings,
    queueOpen: false,
  });
  check(
    "owner can close the queue from settings",
    closedSettings.status === 200 && closedSettings.payload?.queueOpen === false,
  );

  const closedSnapshot = await fetch(`${BASE}/api/public/queue/${businessId}`);
  const closedPayload = await closedSnapshot.json().catch(() => null);
  check(
    "public page reflects the closed queue",
    closedPayload?.queue?.isOpen === false && Boolean(closedPayload?.queue?.closedReason),
    closedPayload?.queue?.closedReason ?? "no reason",
  );

  const blocked = await joinQueue({
    name: `${CUSTOMER_NAME} B`,
    phone: EXTRA_PHONES[0],
    serviceId: service?.id,
  });
  check("join is blocked while the queue is closed", blocked.status === 403, `status ${blocked.status}`);

  const customTemplate = "Hola {nombre}, tu turno en {negocio} ya casi llega";
  const customJoinedTemplate =
    "Hola {nombre}, eres el #{posicion} en {negocio} (~{minutos} min). Mira tu turno: {link}";
  const limitedSettings = await api(`/api/dashboard/businesses/${businessId}/desk-settings`, "PUT", {
    ...initialSettings,
    queueOpen: true,
    maxQueueLength: 1,
    paymentMethods: ["cash"],
    allowTips: false,
    defaultDurationMinutes: 45,
    notificationTemplate: customTemplate,
    queueWhatsappEnabled: true,
    queueJoinedTemplate: customJoinedTemplate,
    queueCalledTemplate: customTemplate,
    retentionDays: 30,
    retentionMessage: "Hola {nombre}, han pasado {dias} días. Vuelve a {negocio}",
  });
  check(
    "owner can save limits, methods and templates",
    limitedSettings.status === 200 &&
      limitedSettings.payload?.maxQueueLength === 1 &&
      limitedSettings.payload?.allowTips === false &&
      limitedSettings.payload?.notificationTemplate === customTemplate &&
      limitedSettings.payload?.queueCalledTemplate === customTemplate &&
      limitedSettings.payload?.queueJoinedTemplate === customJoinedTemplate,
  );

  const firstLimited = await joinQueue({
    name: `${CUSTOMER_NAME} C`,
    phone: EXTRA_PHONES[1],
    serviceId: service?.id,
  });
  if (firstLimited.payload?.token) extraTokens.push(firstLimited.payload.token);
  check("first ticket is accepted under the limit", firstLimited.status === 201, `status ${firstLimited.status}`);

  const [firstLimitedRow] = await sql`
    SELECT id FROM queue_tickets WHERE token = ${firstLimited.payload?.token ?? ""}
  `;
  const customJoinedMessage = await sql`
    SELECT text FROM whatsapp_messages
    WHERE business_id = ${businessId}
      AND payload->>'type' = 'queue_joined'
      AND payload->>'ticketId' = ${String(firstLimitedRow?.id ?? "")}
    ORDER BY id DESC LIMIT 1
  `;
  check(
    "custom join template is rendered with position and ETA",
    customJoinedMessage.length > 0 &&
      customJoinedMessage[0].text?.includes("eres el #1") &&
      customJoinedMessage[0].text?.includes("min)"),
    customJoinedMessage[0]?.text ?? "no message",
  );

  const secondLimited = await joinQueue({
    name: `${CUSTOMER_NAME} D`,
    phone: EXTRA_PHONES[2],
    serviceId: service?.id,
  });
  check("queue limit rejects the next ticket", secondLimited.status === 409, `status ${secondLimited.status}`);

  const ownerQueueConfigured = await api(`/api/dashboard/businesses/${businessId}/queue`);
  check(
    "owner queue returns the saved settings",
    ownerQueueConfigured.payload?.settings?.maxQueueLength === 1 &&
      ownerQueueConfigured.payload?.settings?.notificationTemplate === customTemplate,
  );

  const configuredRetention = await api(`/api/dashboard/businesses/${businessId}/retention`);
  const configuredLapsed = configuredRetention.payload?.clients?.find(
    (client) => client.name === "Smoke Lapsed",
  );
  check(
    "custom retention window and message are applied",
    configuredRetention.payload?.days === 30 &&
      decodeURIComponent(configuredLapsed?.whatsappUrl ?? "").includes("han pasado 60 días"),
    `days ${configuredRetention.payload?.days}`,
  );

  const configuredTicket = ownerQueueConfigured.payload?.tickets?.find(
    (ticket) => ticket.name === `${CUSTOMER_NAME} C`,
  );
  const customCall = await api(
    `/api/dashboard/businesses/${businessId}/queue/tickets/${configuredTicket?.id}/call`,
    "POST",
    {},
  );
  check(
    "custom WhatsApp template is used when notifying",
    customCall.status === 200 &&
      decodeURIComponent(customCall.payload?.whatsappUrl ?? "").includes("ya casi llega"),
  );

  const disabledMethod = await api(
    `/api/dashboard/businesses/${businessId}/cashflow/transactions`,
    "POST",
    { amount: "10.00", method: "yape", note: "settings-smoke" },
  );
  check("disabled payment method is rejected", disabledMethod.status === 400, `status ${disabledMethod.status}`);

  const enabledMethod = await api(
    `/api/dashboard/businesses/${businessId}/cashflow/transactions`,
    "POST",
    { amount: "10.00", method: "cash", note: "settings-smoke" },
  );
  check(
    "enabled payment method is accepted",
    enabledMethod.status === 201,
    `id ${enabledMethod.payload?.id}`,
  );
  if (enabledMethod.payload?.id) {
    await api(
      `/api/dashboard/businesses/${businessId}/cashflow/transactions/${enabledMethod.payload.id}`,
      "DELETE",
    );
  }

  const restored = await api(`/api/dashboard/businesses/${businessId}/desk-settings`, "PUT", initialSettings);
  check(
    "owner can restore the original settings",
    restored.status === 200 &&
      restored.payload?.queueOpen === initialSettings.queueOpen &&
      restored.payload?.paymentMethods?.length === initialSettings.paymentMethods.length,
  );
} finally {
  await cleanup();
  await sql.end();
}

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
