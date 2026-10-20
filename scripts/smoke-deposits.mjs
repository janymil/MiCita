/**
 * End-to-end smoke test for no-show deposits (Phase 5a).
 *
 * Booking → pending deposit → owner records cash/Yape → confirmed.
 * Also covers the online-payment fallback when MercadoPago is not configured.
 *
 * Usage:  node scripts/smoke-deposits.mjs   (server must be running on :5000)
 */
import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config();

const BASE = process.env.SMOKE_BASE_URL || "http://localhost:5000";
const EMAIL = process.env.SMOKE_EMAIL || "demo@micita.pe";
const PASSWORD = process.env.SMOKE_PASSWORD || "DemoMiCita2026!";
const UNIQUE = Date.now().toString().slice(-7);
const PHONE_A = `+5187${UNIQUE}`;
const PHONE_B = `+5186${UNIQUE}`;
const EMAIL_A = `smoke-deposit-${UNIQUE}@example.test`;
const EMAIL_B = `smoke-deposit-b-${UNIQUE}@example.test`;

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
    body: JSON.stringify(body),
  });
  const payload = await res.json().catch(() => null);
  return { status: res.status, payload };
}

async function findSlot(exclude = new Set()) {
  for (let offset = 1; offset <= 14; offset += 1) {
    const date = limaDate(new Date(Date.now() + offset * 86_400_000));
    const response = await fetch(
      `${BASE}/api/appointments/availability/${businessId}?date=${date}&serviceId=${service?.id}`,
    );
    const slots = await response.json().catch(() => []);
    const first = Array.isArray(slots)
      ? slots.find((item) => item.available && !exclude.has(`${date} ${item.time}`))
      : null;
    if (first) return { date, time: first.time };
  }
  return null;
}

async function cleanup() {
  try {
    for (const id of appointmentIds) {
      await sql`DELETE FROM whatsapp_messages WHERE payload->>'appointmentId' = ${String(id)}`;
      await sql`DELETE FROM payments WHERE metadata->>'appointmentId' = ${String(id)}`;
      await sql`DELETE FROM appointments WHERE id = ${id}`;
    }
    for (const phone of [PHONE_A, PHONE_B]) {
      await sql`DELETE FROM clients WHERE phone = ${phone}`;
    }
    for (const email of [EMAIL_A, EMAIL_B]) {
      await sql`DELETE FROM clients WHERE email = ${email}`;
    }
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
const service = services.payload?.find((item) => Number(item.price) > 0) ?? services.payload?.[0];
check("service available", services.status === 200 && Boolean(service), service?.name ?? "none");

const settingsResponse = await api(`/api/dashboard/businesses/${businessId}/desk-settings`);
initialSettings = settingsResponse.payload;
check(
  "settings expose deposit configuration",
  settingsResponse.status === 200 &&
    typeof initialSettings?.depositEnabled === "boolean" &&
    typeof initialSettings?.depositValue === "number" &&
    typeof initialSettings?.depositHoldMinutes === "number",
);

const DEPOSIT_MESSAGE = "DEP {nombre} · {negocio} · S/ {monto} · {fecha} {hora} · {link}";
const POLICY = "Depósito de prueba: se descuenta del servicio y no es reembolsable.";

async function putSettings(patch) {
  return api(`/api/dashboard/businesses/${businessId}/desk-settings`, "PUT", {
    ...initialSettings,
    ...patch,
  });
}

try {
  const configured = await putSettings({
    depositEnabled: true,
    depositType: "fixed",
    depositValue: 10,
    depositHoldMinutes: 30,
    depositMessageTemplate: DEPOSIT_MESSAGE,
    depositPolicy: POLICY,
  });
  check(
    "owner saves deposit configuration",
    configured.status === 200 &&
      configured.payload?.depositEnabled === true &&
      configured.payload?.depositValue === 10 &&
      configured.payload?.depositHoldMinutes === 30,
  );

  const firstSlot = await findSlot();
  check("found a booking slot", Boolean(firstSlot), firstSlot ? `${firstSlot.date} ${firstSlot.time}` : "none");


  if (firstSlot) {
    const booking = await publicPost("/api/appointments/public", {
      businessId,
      serviceId: service?.id,
      date: firstSlot.date,
      time: firstSlot.time,
      clientName: "Smoke Deposit",
      clientPhone: PHONE_A,
      clientEmail: EMAIL_A,
      clientNotes: "smoke-deposits",
    });
    const appointmentId = booking.payload?.appointment?.id ?? null;
    if (appointmentId) appointmentIds.push(appointmentId);
    const manageToken = String(booking.payload?.manageUrl ?? "").split("/").pop() || "";

    check(
      "booking requires the configured deposit",
      booking.status === 200 &&
        booking.payload?.deposit?.required === true &&
        booking.payload?.deposit?.amount === 10 &&
        booking.payload?.deposit?.status === "pending",
      `appointment ${appointmentId} · S/ ${booking.payload?.deposit?.amount}`,
    );
    check(
      "booking stays pending with a deposit hold",
      booking.payload?.appointment?.status === "pending" &&
        booking.payload?.appointment?.depositStatus === "pending",
      booking.payload?.appointment?.status ?? "no status",
    );

    const [row] = await sql`
      SELECT status, deposit_amount, deposit_status, deposit_expires_at
      FROM appointments WHERE id = ${appointmentId}
    `;
    check(
      "deposit hold is persisted",
      row?.status === "pending" &&
        String(row?.deposit_amount) === "10.00" &&
        row?.deposit_status === "pending" &&
        Boolean(row?.deposit_expires_at),
      row ? `${row.status} · ${row.deposit_amount}` : "missing",
    );

    let depositRequest = [];
    for (let attempt = 0; attempt < 12; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      depositRequest = await sql`
        SELECT text, status FROM whatsapp_messages
        WHERE payload->>'appointmentId' = ${String(appointmentId)}
          AND payload->>'type' = 'booking_deposit_request'
        ORDER BY id DESC LIMIT 1
      `;
      if (depositRequest.length) break;
    }
    check(
      "customer receives the deposit request with the manage link",
      depositRequest.length > 0 &&
        String(depositRequest[0].text).includes("DEP Smoke Deposit") &&
        String(depositRequest[0].text).includes("/cita/"),
      depositRequest[0]?.status ?? "missing",
    );

    const publicView = await fetch(`${BASE}/api/public/appointments/${manageToken}`);
    const publicPayload = await publicView.json().catch(() => null);
    check(
      "manage page exposes the pending deposit",
      publicView.ok &&
        publicPayload?.deposit?.status === "pending" &&
        publicPayload?.deposit?.amount === 10 &&
        publicPayload?.deposit?.policy === POLICY,
      publicPayload?.deposit?.status ?? "missing",
    );

    const checkout = await publicPost(`/api/public/appointments/${manageToken}/deposit`, {});
    check(
      "online checkout reports the gateway fallback",
      checkout.status === 503 && checkout.payload?.code === "gateway_not_configured",
      `status ${checkout.status}`,
    );

    const today = await api(`/api/dashboard/businesses/${businessId}/today?date=${firstSlot.date}`);
    const deskRow = today.payload?.appointments?.find((item) => item.id === appointmentId);
    check(
      "owner sees the pending deposit on Hoy",
      today.status === 200 &&
        deskRow?.depositStatus === "pending" &&
        Number(deskRow?.depositAmount) === 10,
      deskRow ? `S/ ${deskRow.depositAmount}` : "missing",
    );


    const paid = await api(
      `/api/dashboard/businesses/${businessId}/appointments/${appointmentId}/deposit`,
      "PATCH",
      { status: "paid", method: "cash" },
    );
    check(
      "owner records the deposit and confirms the booking",
      paid.status === 200 &&
        paid.payload?.appointment?.status === "confirmed" &&
        paid.payload?.appointment?.depositStatus === "paid",
      paid.payload?.appointment?.status ?? "no status",
    );

    const [manualPayment] = await sql`
      SELECT provider, amount, status, metadata
      FROM payments
      WHERE metadata->>'appointmentId' = ${String(appointmentId)}
      ORDER BY id DESC LIMIT 1
    `;
    check(
      "manual deposit is recorded in the payments ledger",
      manualPayment?.provider === "manual" &&
        String(manualPayment?.amount) === "10.00" &&
        manualPayment?.status === "approved" &&
        manualPayment?.metadata?.type === "booking_deposit",
      manualPayment ? `${manualPayment.provider} · ${manualPayment.status}` : "missing",
    );

    let confirmation = null;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      const [message] = await sql`
        SELECT text, status FROM whatsapp_messages
        WHERE payload->>'appointmentId' = ${String(appointmentId)}
          AND payload->>'type' = 'booking_confirmation'
        ORDER BY id DESC LIMIT 1
      `;
      if (message) {
        confirmation = message;
        break;
      }
    }
    check(
      "paid deposit triggers the booking confirmation",
      Boolean(confirmation) && String(confirmation?.text ?? "").includes("Smoke Deposit"),
      confirmation?.status ?? "missing",
    );

    // Second booking: release the unpaid hold and verify it is cancelled.
    const secondSlot = await findSlot(new Set([`${firstSlot.date} ${firstSlot.time}`]));
    if (secondSlot) {
      const second = await publicPost("/api/appointments/public", {
        businessId,
        serviceId: service?.id,
        date: secondSlot.date,
        time: secondSlot.time,
        clientName: "Smoke Deposit B",
        clientPhone: PHONE_B,
        clientEmail: EMAIL_B,
        clientNotes: "smoke-deposits-release",
      });
      const secondId = second.payload?.appointment?.id ?? null;
      if (secondId) appointmentIds.push(secondId);

      const released = await api(
        `/api/dashboard/businesses/${businessId}/appointments/${secondId}/deposit`,
        "PATCH",
        { status: "released" },
      );
      check(
        "owner can release an unpaid deposit hold",
        released.status === 200 &&
          released.payload?.appointment?.status === "cancelled" &&
          released.payload?.appointment?.depositStatus === "expired",
        released.payload?.appointment?.status ?? "no status",
      );
    } else {
      check("found a second booking slot", false, "none");
    }
  }

  const restored = await api(`/api/dashboard/businesses/${businessId}/desk-settings`, "PUT", initialSettings);
  check(
    "owner can restore the original settings",
    restored.status === 200 && restored.payload?.depositEnabled === initialSettings.depositEnabled,
  );
} finally {
  await cleanup();
  await sql.end();
}

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
