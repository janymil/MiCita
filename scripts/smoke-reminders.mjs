/**
 * End-to-end smoke test for WhatsApp reminders + booking confirmations.
 *
 * Usage:  node scripts/smoke-reminders.mjs   (server must be running on :5000)
 */
import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config();

const BASE = process.env.SMOKE_BASE_URL || "http://localhost:5000";
const EMAIL = process.env.SMOKE_EMAIL || "demo@micita.pe";
const PASSWORD = process.env.SMOKE_PASSWORD || "DemoMiCita2026!";
const UNIQUE = Date.now().toString().slice(-7);
const PHONE_A = `+5190${UNIQUE}`;
const PHONE_B = `+5189${UNIQUE}`;
const PHONE_C = `+5188${UNIQUE}`;
const EMAIL_C = `smoke-reminder-${UNIQUE}@example.test`;

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
const appointmentIds = [];
const clientPhones = [PHONE_A, PHONE_B, PHONE_C];

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
    for (const id of appointmentIds) {
      await sql`DELETE FROM whatsapp_messages WHERE payload->>'appointmentId' = ${String(id)}`;
      await sql`DELETE FROM appointments WHERE id = ${id}`;
    }
    for (const phone of clientPhones) {
      await sql`DELETE FROM clients WHERE phone = ${phone}`;
    }
    await sql`DELETE FROM clients WHERE email = ${EMAIL_C}`;
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
  "settings expose WhatsApp reminder configuration",
  settingsResponse.status === 200 &&
    typeof initialSettings?.whatsappRemindersEnabled === "boolean" &&
    typeof initialSettings?.reminderHoursBefore === "number",
);

const REMINDER_TEMPLATE = "R {nombre} · {negocio} · {servicio} · {fecha} {hora} · {link}";
const CONFIRMATION_TEMPLATE = "CONF {nombre} · {negocio} · {servicio} · {hora} · {link}";

async function putSettings(patch) {
  return api(`/api/dashboard/businesses/${businessId}/desk-settings`, "PUT", {
    ...initialSettings,
    ...patch,
  });
}

async function insertFixture(name, phone, minutesAhead) {
  const [client] = await sql`
    INSERT INTO clients (business_id, name, phone)
    VALUES (${businessId}, ${name}, ${phone})
    RETURNING id
  `;
  const when = new Date(Date.now() + minutesAhead * 60_000);
  const [appointment] = await sql`
    INSERT INTO appointments
      (business_id, client_id, service_id, date, time, duration, status, price, source, cancel_token)
    VALUES
      (${businessId}, ${client.id}, ${service?.id}, ${limaDate(when)}, ${limaTime(when)}, 30,
       'confirmed', '25.00', 'booking', ${`smoke-rem-${UNIQUE}-${minutesAhead}`})
    RETURNING id, date, time
  `;
  appointmentIds.push(appointment.id);
  return { appointmentId: appointment.id, clientId: client.id, date: appointment.date, time: appointment.time };
}

try {
  const enabled = await putSettings({
    whatsappRemindersEnabled: true,
    reminderHoursBefore: 2,
    whatsappReminderTemplate: REMINDER_TEMPLATE,
    whatsappConfirmationsEnabled: true,
    whatsappConfirmationTemplate: CONFIRMATION_TEMPLATE,
  });
  check(
    "owner saves reminder window and templates",
    enabled.status === 200 &&
      enabled.payload?.reminderHoursBefore === 2 &&
      enabled.payload?.whatsappReminderTemplate === REMINDER_TEMPLATE,
  );

  const fixtureA = await insertFixture("Smoke Reminder A", PHONE_A, 60);

  const passA = await api(`/api/dashboard/businesses/${businessId}/reminders/run`, "POST", {});
  check(
    "manual pass scans the due appointment",
    passA.status === 200 && passA.payload?.scanned >= 1,
    `scanned ${passA.payload?.scanned} · sent ${passA.payload?.sent} · skipped ${passA.payload?.skipped}`,
  );

  const [stampedA] = await sql`
    SELECT whatsapp_reminder_sent_at FROM appointments WHERE id = ${fixtureA.appointmentId}
  `;
  check("reminder is stamped on the appointment", Boolean(stampedA?.whatsapp_reminder_sent_at));

  const reminderMessages = await sql`
    SELECT text, status FROM whatsapp_messages
    WHERE payload->>'appointmentId' = ${String(fixtureA.appointmentId)}
      AND payload->>'type' = 'appointment_reminder'
  `;
  const reminderText = reminderMessages[0]?.text ?? "";
  check(
    "reminder uses the owner template and manage link",
    reminderMessages.length === 1 &&
      reminderText.includes("Smoke Reminder A") &&
      reminderText.includes("/cita/smoke-rem-"),
    reminderMessages[0]?.status ?? "missing",
  );

  const passAgain = await api(`/api/dashboard/businesses/${businessId}/reminders/run`, "POST", {});
  check(
    "a second pass does not resend",
    passAgain.status === 200 && Number(passAgain.payload?.scanned ?? 0) === 0,
  );

  const fixtureB = await insertFixture("Smoke Reminder B", PHONE_B, 60);
  const disabled = await putSettings({
    whatsappRemindersEnabled: false,
    whatsappReminderTemplate: REMINDER_TEMPLATE,
  });
  check("owner can disable reminders", disabled.status === 200 && disabled.payload?.whatsappRemindersEnabled === false);

  const passDisabled = await api(`/api/dashboard/businesses/${businessId}/reminders/run`, "POST", {});
  const [stampedB] = await sql`
    SELECT whatsapp_reminder_sent_at FROM appointments WHERE id = ${fixtureB.appointmentId}
  `;
  check(
    "disabled reminders are skipped without stamping",
    passDisabled.status === 200 &&
      passDisabled.payload?.disabled >= 1 &&
      !stampedB?.whatsapp_reminder_sent_at,
  );


  // Booking confirmation through the public booking route.
  const confirmationSettings = await putSettings({
    whatsappRemindersEnabled: true,
    whatsappConfirmationsEnabled: true,
    whatsappReminderTemplate: REMINDER_TEMPLATE,
    whatsappConfirmationTemplate: CONFIRMATION_TEMPLATE,
  });
  check("confirmations stay enabled", confirmationSettings.status === 200);

  let slot = null;
  for (let offset = 1; offset <= 7 && !slot; offset += 1) {
    const date = limaDate(new Date(Date.now() + offset * 86_400_000));
    const availability = await fetch(
      `${BASE}/api/appointments/availability/${businessId}?date=${date}&serviceId=${service?.id}`,
    );
    const slots = await availability.json().catch(() => []);
    const first = Array.isArray(slots) ? slots.find((item) => item.available) : null;
    if (first) slot = { date, time: first.time };
  }
  check("found a public booking slot", Boolean(slot), slot ? `${slot.date} ${slot.time}` : "none");

  if (slot) {
    const booking = await publicPost("/api/appointments/public", {
      businessId,
      serviceId: service?.id,
      date: slot.date,
      time: slot.time,
      clientName: "Smoke Confirmation",
      clientPhone: PHONE_C,
      clientEmail: EMAIL_C,
      clientNotes: "smoke-reminders",
    });
    const confirmationAppointmentId = booking.payload?.appointment?.id ?? null;
    if (confirmationAppointmentId) appointmentIds.push(confirmationAppointmentId);
    check(
      "public booking succeeds",
      booking.status === 200 && Boolean(confirmationAppointmentId),
      `appointment ${confirmationAppointmentId}`,
    );

    let confirmationMessage = null;
    let confirmationStamp = null;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const rows = await sql`
        SELECT text, status FROM whatsapp_messages
        WHERE payload->>'appointmentId' = ${String(confirmationAppointmentId)}
          AND payload->>'type' = 'booking_confirmation'
      `;
      if (rows.length) {
        confirmationMessage = rows[0];
        const [stamp] = await sql`
          SELECT whatsapp_confirmation_sent_at FROM appointments WHERE id = ${confirmationAppointmentId}
        `;
        confirmationStamp = stamp?.whatsapp_confirmation_sent_at ?? null;
        break;
      }
    }

    check(
      "booking sends a confirmation with the manage link",
      Boolean(confirmationMessage) &&
        String(confirmationMessage?.text ?? "").includes("CONF Smoke Confirmation") &&
        String(confirmationMessage?.text ?? "").includes("/cita/"),
      confirmationMessage?.status ?? "missing",
    );
    check("confirmation is stamped on the appointment", Boolean(confirmationStamp));
  }

  const restored = await api(`/api/dashboard/businesses/${businessId}/desk-settings`, "PUT", initialSettings);
  check("settings restored", restored.status === 200);
} finally {
  await cleanup();
  await sql.end();
}

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
