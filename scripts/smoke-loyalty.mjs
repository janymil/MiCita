/**
 * End-to-end smoke test for loyalty stamps (Phase 8).
 *
 * Two completed visits → second stamp unlocks a reward → public card lookup →
 * owner redeems it. Also checks duplicate redemption and cleanup.
 *
 * Usage:  node scripts/smoke-loyalty.mjs   (server must be running on :5000)
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
let cardId = null;
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
    if (cardId) {
      await sql`DELETE FROM whatsapp_messages WHERE payload->>'cardId' = ${String(cardId)}`;
      await sql`DELETE FROM loyalty_cards WHERE id = ${cardId}`;
    }
    for (const id of appointmentIds) {
      await sql`DELETE FROM whatsapp_messages WHERE payload->>'appointmentId' = ${String(id)}`;
      await sql`DELETE FROM service_transactions WHERE appointment_id = ${id}`;
      await sql`DELETE FROM appointments WHERE id = ${id}`;
    }
    if (clientId) await sql`DELETE FROM clients WHERE id = ${clientId}`;
    await sql`DELETE FROM clients WHERE phone = ${PHONE}`;
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
  "settings expose loyalty configuration",
  settingsResponse.status === 200 &&
    typeof initialSettings?.loyaltyEnabled === "boolean" &&
    typeof initialSettings?.loyaltyStampsRequired === "number",
);

const STAMP_TEMPLATE = "LOY {nombre} · {negocio} · {sellos}/{meta} · {link}";
const REWARD_TEMPLATE = "REW {nombre} · {recompensa} · {link}";
const configured = await api(`/api/dashboard/businesses/${businessId}/desk-settings`, "PUT", {
  ...initialSettings,
  loyaltyEnabled: true,
  showLoyaltyOnMicrosite: true,
  loyaltyStampsRequired: 2,
  loyaltyReward: "Corte gratis",
  loyaltyMessageTemplate: STAMP_TEMPLATE,
  loyaltyRewardMessageTemplate: REWARD_TEMPLATE,
  depositEnabled: false,
});
check(
  "owner saves loyalty configuration",
  configured.status === 200 &&
    configured.payload?.loyaltyEnabled === true &&
    configured.payload?.loyaltyStampsRequired === 2 &&
    configured.payload?.loyaltyReward === "Corte gratis",
);

try {
  const walkIn = await api(`/api/dashboard/businesses/${businessId}/walk-ins`, "POST", {
    serviceId: service?.id,
    name: "Smoke Loyalty",
    phone: PHONE,
    force: true,
  });
  const firstAppointmentId = walkIn.payload?.appointment?.id ?? null;
  clientId = walkIn.payload?.client?.id ?? null;
  if (firstAppointmentId) appointmentIds.push(firstAppointmentId);
  check(
    "first walk-in created",
    walkIn.status === 201 && Boolean(firstAppointmentId),
    `appointment ${firstAppointmentId}`,
  );

  const firstFinish = await api(
    `/api/dashboard/businesses/${businessId}/appointments/${firstAppointmentId}/finish`,
    "PATCH",
    {},
  );
  check("first service finished", firstFinish.status === 200, `status ${firstFinish.status}`);


  let firstMessage = null;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    const [message] = await sql`
      SELECT text, status FROM whatsapp_messages
      WHERE payload->>'appointmentId' = ${String(firstAppointmentId)}
        AND payload->>'type' = 'loyalty_stamp'
      ORDER BY id DESC LIMIT 1
    `;
    if (message) {
      firstMessage = message;
      break;
    }
  }
  check(
    "first stamp sends the loyalty WhatsApp",
    Boolean(firstMessage) &&
      String(firstMessage.text).includes("LOY Smoke Loyalty") &&
      String(firstMessage.text).includes("1/2"),
    firstMessage?.status ?? "missing",
  );

  const [firstCard] = await sql`
    SELECT id, total_stamps, rewards_redeemed, token
    FROM loyalty_cards WHERE business_id = ${businessId} AND phone = ${NORMALIZED_PHONE}
  `;
  cardId = firstCard?.id ?? null;
  check(
    "loyalty card is created with one stamp",
    Boolean(cardId) && firstCard?.total_stamps === 1 && firstCard?.rewards_redeemed === 0,
    firstCard ? `${firstCard.total_stamps} stamps` : "missing",
  );

  const secondWalkIn = await api(`/api/dashboard/businesses/${businessId}/walk-ins`, "POST", {
    serviceId: service?.id,
    name: "Smoke Loyalty",
    phone: PHONE,
    force: true,
  });
  const secondAppointmentId = secondWalkIn.payload?.appointment?.id ?? null;
  if (secondAppointmentId) appointmentIds.push(secondAppointmentId);
  check(
    "second walk-in created",
    secondWalkIn.status === 201 && Boolean(secondAppointmentId),
    `appointment ${secondAppointmentId}`,
  );

  const secondFinish = await api(
    `/api/dashboard/businesses/${businessId}/appointments/${secondAppointmentId}/finish`,
    "PATCH",
    {},
  );
  check("second service finished", secondFinish.status === 200, `status ${secondFinish.status}`);

  let rewardMessage = null;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    const [message] = await sql`
      SELECT text, status FROM whatsapp_messages
      WHERE payload->>'appointmentId' = ${String(secondAppointmentId)}
        AND payload->>'type' = 'loyalty_stamp'
      ORDER BY id DESC LIMIT 1
    `;
    if (message) {
      rewardMessage = message;
      break;
    }
  }
  check(
    "second stamp unlocks the reward message",
    Boolean(rewardMessage) &&
      String(rewardMessage.text).includes("REW Smoke Loyalty") &&
      String(rewardMessage.text).includes("Corte gratis"),
    rewardMessage?.status ?? "missing",
  );

  const [afterSecond] = await sql`
    SELECT total_stamps, rewards_redeemed FROM loyalty_cards WHERE id = ${cardId}
  `;
  check(
    "card has two stamps after the second visit",
    afterSecond?.total_stamps === 2 && afterSecond?.rewards_redeemed === 0,
    `${afterSecond?.total_stamps} stamps`,
  );


  const ownerLoyalty = await api(`/api/dashboard/businesses/${businessId}/loyalty`);
  const ownerCard = ownerLoyalty.payload?.cards?.find((card) => card.id === cardId);
  check(
    "owner sees a card with one reward ready",
    ownerLoyalty.status === 200 &&
      ownerCard?.availableRewards === 1 &&
      ownerCard?.progress === 0 &&
      ownerCard?.required === 2,
    ownerCard ? `${ownerCard.availableRewards} ready` : "missing",
  );

  const lookup = await publicPost(`/api/public/loyalty/${businessId}/lookup`, {
    phone: LOCAL_PHONE,
  });
  const lookupCard = lookup.payload?.card;
  check(
    "customer finds the card by phone",
    lookup.status === 200 &&
      lookupCard?.id === cardId &&
      lookup.payload?.progress?.availableRewards === 1 &&
      lookup.payload?.reward === "Corte gratis",
    lookupCard ? `token ${String(lookupCard.token).slice(0, 6)}…` : "missing",
  );

  const tokenView = await fetch(`${BASE}/api/public/loyalty/t/${lookupCard?.token}`);
  const tokenPayload = await tokenView.json().catch(() => null);
  check(
    "token link shows the same card",
    tokenView.ok &&
      tokenPayload?.card?.id === cardId &&
      tokenPayload?.progress?.totalStamps === 2 &&
      tokenPayload?.history?.length >= 2,
    `${tokenPayload?.history?.length ?? 0} events`,
  );

  const redeemed = await api(
    `/api/dashboard/businesses/${businessId}/loyalty/${cardId}/redeem`,
    "POST",
    {},
  );
  check(
    "owner redeems the reward",
    redeemed.status === 200 &&
      redeemed.payload?.card?.rewardsRedeemed === 1 &&
      redeemed.payload?.progress?.availableRewards === 0,
    `redeemed ${redeemed.payload?.card?.rewardsRedeemed}`,
  );

  const duplicateRedeem = await api(
    `/api/dashboard/businesses/${businessId}/loyalty/${cardId}/redeem`,
    "POST",
    {},
  );
  check("redeeming twice is rejected", duplicateRedeem.status === 409, `status ${duplicateRedeem.status}`);

  const [eventCounts] = await sql`
    SELECT
      count(*) FILTER (WHERE type = 'stamp')::int AS stamps,
      count(*) FILTER (WHERE type = 'redeem')::int AS redeems
    FROM loyalty_events WHERE card_id = ${cardId}
  `;
  check(
    "loyalty ledger records stamps and redemption",
    eventCounts?.stamps === 2 && eventCounts?.redeems === 1,
    `${eventCounts?.stamps} stamps · ${eventCounts?.redeems} redeems`,
  );

  const restored = await api(`/api/dashboard/businesses/${businessId}/desk-settings`, "PUT", initialSettings);
  check(
    "owner can restore the original settings",
    restored.status === 200 && restored.payload?.loyaltyEnabled === initialSettings.loyaltyEnabled,
  );
} finally {
  await cleanup();
  await sql.end();
}

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
