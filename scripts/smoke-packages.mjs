/**
 * End-to-end smoke test for prepaid service packages (Phase 9).
 *
 * Creates a bono, sells it manually, checks public listing/card, redeems it on
 * a finished walk-in, verifies the balance/ledger, and rejects an expired bono.
 *
 * Usage:  node scripts/smoke-packages.mjs   (server must be running on :5000)
 */
import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config();

const BASE = process.env.SMOKE_BASE_URL || "http://localhost:5000";
const EMAIL = process.env.SMOKE_EMAIL || "demo@micita.pe";
const PASSWORD = process.env.SMOKE_PASSWORD || "DemoMiCita2026!";
const UNIQUE = Date.now().toString().slice(-7);
const LOCAL_PHONE = `9${UNIQUE}0`;
const PHONE = `+51${LOCAL_PHONE}`;
const NORMALIZED_PHONE = `51${LOCAL_PHONE}`;

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
let packageId = null;
let purchaseId = null;
let clientId = null;
const appointmentIds = [];

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
    if (purchaseId) {
      await sql`DELETE FROM whatsapp_messages WHERE payload->>'purchaseId' = ${String(purchaseId)}`;
      await sql`DELETE FROM payments WHERE metadata->>'purchaseId' = ${String(purchaseId)}`;
    }
    for (const id of appointmentIds) {
      await sql`DELETE FROM whatsapp_messages WHERE payload->>'appointmentId' = ${String(id)}`;
      await sql`DELETE FROM service_transactions WHERE appointment_id = ${id}`;
      await sql`DELETE FROM package_redemptions WHERE appointment_id = ${id}`;
      await sql`DELETE FROM loyalty_events WHERE appointment_id = ${id}`;
      await sql`DELETE FROM appointments WHERE id = ${id}`;
    }
    if (packageId) await sql`DELETE FROM service_packages WHERE id = ${packageId}`;
    if (clientId) await sql`DELETE FROM clients WHERE id = ${clientId}`;
    await sql`DELETE FROM clients WHERE phone IN (${PHONE}, ${NORMALIZED_PHONE})`;
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

// Double-submit CSRF bootstrap.
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
  "settings expose package configuration",
  settingsResponse.status === 200 &&
    typeof initialSettings?.packagesEnabled === "boolean" &&
    typeof initialSettings?.packageSaleMessageTemplate === "string",
);

const configured = await api(`/api/dashboard/businesses/${businessId}/desk-settings`, "PUT", {
  ...initialSettings,
  packagesEnabled: true,
  showPackagesOnMicrosite: true,
  packageSaleMessageTemplate: "PKG {nombre} · {paquete} · {usos} usos · {link}",
  packageUseMessageTemplate: "USE {nombre} · quedan {restantes} · {link}",
  depositEnabled: false,
});
check(
  "owner saves package configuration",
  configured.status === 200 &&
    configured.payload?.packagesEnabled === true &&
    configured.payload?.showPackagesOnMicrosite === true,
);


try {
  const created = await api(`/api/dashboard/businesses/${businessId}/packages`, "POST", {
    serviceId: service?.id,
    name: "Bono smoke 4 cortes",
    description: "Paquete de prueba",
    uses: 4,
    price: 80,
    validityDays: 60,
  });
  packageId = created.payload?.package?.id ?? null;
  check(
    "owner creates a package template",
    created.status === 201 && Boolean(packageId),
    `package ${packageId}`,
  );

  const sold = await api(
    `/api/dashboard/businesses/${businessId}/packages/${packageId}/sell`,
    "POST",
    { name: "Smoke Packages", phone: PHONE, method: "cash" },
  );
  purchaseId = sold.payload?.purchase?.id ?? null;
  clientId = sold.payload?.purchase?.clientId ?? null;
  const purchaseToken = sold.payload?.purchase?.token ?? "";
  check(
    "owner sells a bono for cash",
    sold.status === 201 &&
      sold.payload?.purchase?.status === "active" &&
      sold.payload?.purchase?.usesRemaining === 4 &&
      Boolean(purchaseToken),
    `purchase ${purchaseId}`,
  );

  let receipt = null;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    const [message] = await sql`
      SELECT text, status FROM whatsapp_messages
      WHERE payload->>'purchaseId' = ${String(purchaseId)}
        AND payload->>'type' = 'package_purchase'
      ORDER BY id DESC LIMIT 1
    `;
    if (message) {
      receipt = message;
      break;
    }
  }
  check(
    "sale sends the package receipt WhatsApp",
    Boolean(receipt) &&
      String(receipt.text).includes("PKG Smoke Packages") &&
      String(receipt.text).includes("4 usos"),
    receipt?.status ?? "missing",
  );


  const listing = await fetch(`${BASE}/api/public/packages/by-business/${businessId}`);
  const listingPayload = await listing.json().catch(() => null);
  const listed = listingPayload?.packages?.find((item) => item.id === packageId);
  check(
    "package appears on the public microsite",
    listing.ok && listingPayload?.enabled === true && Boolean(listed) && listed?.uses === 4,
    listed?.name ?? "missing",
  );

  const detail = await fetch(`${BASE}/api/public/packages/${packageId}`);
  const detailPayload = await detail.json().catch(() => null);
  check(
    "public purchase page loads the package",
    detail.ok &&
      detailPayload?.package?.id === packageId &&
      typeof detailPayload?.checkoutAvailable === "boolean",
    `gateway ${detailPayload?.checkoutAvailable}`,
  );

  const onlinePurchase = await publicPost(`/api/public/packages/${packageId}/purchase`, {
    name: "Smoke Packages",
    phone: LOCAL_PHONE,
  });
  check(
    "online purchase is gated when MercadoPago is not configured",
    onlinePurchase.status === 503 &&
      onlinePurchase.payload?.code === "gateway_not_configured",
    `status ${onlinePurchase.status}`,
  );

  const card = await fetch(`${BASE}/api/public/packages/t/${purchaseToken}`);
  const cardPayload = await card.json().catch(() => null);
  check(
    "token card shows the active balance",
    card.ok &&
      cardPayload?.purchase?.id === purchaseId &&
      cardPayload?.purchase?.usesRemaining === 4 &&
      cardPayload?.purchase?.status === "active",
    `${cardPayload?.purchase?.usesRemaining} uses`,
  );

  const ownerList = await api(`/api/dashboard/businesses/${businessId}/packages`);
  check(
    "owner dashboard lists the sale and outstanding uses",
    ownerList.status === 200 &&
      ownerList.payload?.stats?.activePurchases >= 1 &&
      ownerList.payload?.stats?.outstandingUses >= 4,
    `${ownerList.payload?.stats?.outstandingUses} uses`,
  );

  const walkIn = await api(`/api/dashboard/businesses/${businessId}/walk-ins`, "POST", {
    serviceId: service?.id,
    name: "Smoke Packages",
    phone: PHONE,
    force: true,
  });
  const appointmentId = walkIn.payload?.appointment?.id ?? null;
  if (appointmentId) appointmentIds.push(appointmentId);
  check(
    "walk-in uses the package client",
    walkIn.status === 201 && Boolean(appointmentId),
    `appointment ${appointmentId}`,
  );

  const today = await api(`/api/dashboard/businesses/${businessId}/today`);
  const todayAppointment = today.payload?.appointments?.find(
    (item) => item.id === appointmentId,
  );
  check(
    "Hoy shows the client's remaining bono uses",
    today.status === 200 && todayAppointment?.packageUsesRemaining === 4,
    `${todayAppointment?.packageUsesRemaining ?? 0} uses`,
  );

  const applicable = await api(
    `/api/dashboard/businesses/${businessId}/appointments/${appointmentId}/package`,
  );
  check(
    "finish dialog finds the applicable bono",
    applicable.status === 200 &&
      applicable.payload?.packages?.some((item) => item.purchase.id === purchaseId),
    `${applicable.payload?.packages?.length ?? 0} packages`,
  );

  const finished = await api(
    `/api/dashboard/businesses/${businessId}/appointments/${appointmentId}/finish`,
    "PATCH",
    { packagePurchaseId: purchaseId },
  );
  check(
    "finishing with a bono consumes one use",
    finished.status === 200 &&
      finished.payload?.packageRedemption?.usesRemaining === 3 &&
      finished.payload?.transaction === null,
    `remaining ${finished.payload?.packageRedemption?.usesRemaining}`,
  );


  const [balance] = await sql`
    SELECT uses_remaining, status FROM package_purchases WHERE id = ${purchaseId}
  `;
  const [ledger] = await sql`
    SELECT count(*)::int AS redemptions FROM package_redemptions WHERE purchase_id = ${purchaseId}
  `;
  check(
    "package balance and ledger persist one redemption",
    balance?.uses_remaining === 3 && balance?.status === "active" && ledger?.redemptions === 1,
    `${balance?.uses_remaining} left · ${ledger?.redemptions} redemption`,
  );

  let useMessage = null;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    const [message] = await sql`
      SELECT text, status FROM whatsapp_messages
      WHERE payload->>'appointmentId' = ${String(appointmentId)}
        AND payload->>'type' = 'package_use'
      ORDER BY id DESC LIMIT 1
    `;
    if (message) {
      useMessage = message;
      break;
    }
  }
  check(
    "using a bono sends the remaining-uses WhatsApp",
    Boolean(useMessage) && String(useMessage.text).includes("USE Smoke Packages") &&
      String(useMessage.text).includes("3"),
    useMessage?.status ?? "missing",
  );

  await sql`
    UPDATE package_purchases
    SET uses_remaining = 1, expires_at = now() + interval '5 days'
    WHERE id = ${purchaseId}
  `;
  const reminderRun = await api(
    `/api/dashboard/businesses/${businessId}/packages/reminders/run`,
    "POST",
    {},
  );
  check(
    "low-balance reminder pass processes the purchase",
    reminderRun.status === 200 &&
      (reminderRun.payload?.lowBalanceSent >= 1 || reminderRun.payload?.scanned >= 1),
    `${reminderRun.payload?.lowBalanceSent ?? 0} sent · ${reminderRun.payload?.scanned ?? 0} scanned`,
  );
  const [lowMessage] = await sql`
    SELECT text FROM whatsapp_messages
    WHERE payload->>'purchaseId' = ${String(purchaseId)}
      AND payload->>'type' = 'package_low_balance'
    ORDER BY id DESC LIMIT 1
  `;
  check(
    "low-balance WhatsApp uses the remaining-use template",
    Boolean(lowMessage) && String(lowMessage.text).includes("1 uso"),
    lowMessage ? "sent" : "missing",
  );

  const [expiryMessage] = await sql`
    SELECT text FROM whatsapp_messages
    WHERE payload->>'purchaseId' = ${String(purchaseId)}
      AND payload->>'type' = 'package_expiry'
    ORDER BY id DESC LIMIT 1
  `;
  check(
    "expiry reminder is sent inside the seven-day window",
    Boolean(expiryMessage) && String(expiryMessage.text).includes("vence el"),
    expiryMessage ? "sent" : "missing",
  );

  const secondReminderRun = await api(
    `/api/dashboard/businesses/${businessId}/packages/reminders/run`,
    "POST",
    {},
  );
  check(
    "low-balance reminder is idempotent",
    secondReminderRun.status === 200 &&
      secondReminderRun.payload?.lowBalanceSent === 0 &&
      secondReminderRun.payload?.expirySent === 0,
    `${secondReminderRun.payload?.lowBalanceSent ?? 0} low · ${secondReminderRun.payload?.expirySent ?? 0} expiry`,
  );

  await sql`UPDATE package_purchases SET expires_at = now() - interval '1 day' WHERE id = ${purchaseId}`;
  const expiredWalkIn = await api(`/api/dashboard/businesses/${businessId}/walk-ins`, "POST", {
    serviceId: service?.id,
    name: "Smoke Packages",
    phone: PHONE,
    force: true,
  });
  const expiredAppointmentId = expiredWalkIn.payload?.appointment?.id ?? null;
  if (expiredAppointmentId) appointmentIds.push(expiredAppointmentId);
  const expiredFinish = await api(
    `/api/dashboard/businesses/${businessId}/appointments/${expiredAppointmentId}/finish`,
    "PATCH",
    { packagePurchaseId: purchaseId },
  );
  const [expiredAppointment] = await sql`
    SELECT status FROM appointments WHERE id = ${expiredAppointmentId}
  `;
  check(
    "an expired bono is rejected without finishing the visit",
    expiredFinish.status === 409 &&
      String(expiredFinish.payload?.message ?? "").toLowerCase().includes("venció") &&
      expiredAppointment?.status !== "completed",
    `status ${expiredFinish.status}`,
  );

  const restored = await api(
    `/api/dashboard/businesses/${businessId}/desk-settings`,
    "PUT",
    initialSettings,
  );
  check(
    "owner can restore the original settings",
    restored.status === 200 && restored.payload?.packagesEnabled === initialSettings.packagesEnabled,
  );
} finally {
  await cleanup();
  await sql.end();
}

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
