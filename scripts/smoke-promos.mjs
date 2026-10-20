/**
 * End-to-end smoke test for F2 (dead-hour promos + central WhatsApp bot).
 *
 * Usage:  node scripts/smoke-promos.mjs   (server must be running on :5000)
 */
import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config();

const BASE = process.env.SMOKE_BASE_URL || "http://localhost:5000";
const EMAIL = process.env.SMOKE_EMAIL || "demo@micita.pe";
const PASSWORD = process.env.SMOKE_PASSWORD || "DemoMiCita2026!";
const UNIQUE = Date.now().toString().slice(-7);
const PHONE_A = `+5193${UNIQUE}`;
const PHONE_B = `+5192${UNIQUE}`;
const PHONE_C = `+5191${UNIQUE}`;
const PHONES = [PHONE_A, PHONE_B, PHONE_C];

function limaDate(offsetDays = 0) {
  return new Date(Date.now() + offsetDays * 86_400_000).toLocaleDateString("en-CA", {
    timeZone: "America/Lima",
  });
}

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
let promoId = null;
let promoCode = null;
let initialSettings = null;

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
    if (promoCode) {
      await sql`DELETE FROM appointments WHERE notes = ${`Promo ${promoCode}`}`;
    }
    if (promoId) {
      await sql`DELETE FROM promos WHERE id = ${promoId}`;
    }
    for (const phone of PHONES) {
      await sql`DELETE FROM clients WHERE phone = ${phone}`;
    }
    if (promoCode) {
      await sql`DELETE FROM whatsapp_messages WHERE text LIKE ${`%${promoCode}%`}`;
    }
    await sql`
      DELETE FROM whatsapp_messages
      WHERE text LIKE ${`%Smoke Promo ${UNIQUE}%`}
         OR provider_message_id LIKE 'smoke-%'
         OR payload->>'inboundId' LIKE 'smoke-%'
    `;
    if (initialSettings) {
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
check("services available", services.status === 200 && Boolean(service), service?.name ?? "none");

const settingsResponse = await api(`/api/dashboard/businesses/${businessId}/desk-settings`);
initialSettings = settingsResponse.payload;
check(
  "settings expose promo configuration",
  settingsResponse.status === 200 && typeof initialSettings?.promosEnabled === "boolean",
);

const businessSettings = await api(`/api/dashboard/businesses/${businessId}/settings`);
const micrositeSlug = businessSettings.payload?.customUrl ?? null;

try {
  const created = await api(`/api/dashboard/businesses/${businessId}/promos`, "POST", {
    serviceId: service?.id,
    title: `Smoke Promo ${UNIQUE}`,
    description: "Promo de prueba end-to-end",
    promoPrice: "9.90",
    date: limaDate(1),
    startTime: "10:00",
    endTime: "13:00",
    capacity: 2,
  });
  promoId = created.payload?.id ?? null;
  promoCode = created.payload?.code ?? null;
  check(
    "owner creates a promo with code and share kit",
    created.status === 201 && Boolean(promoCode) && String(created.payload?.publicUrl).includes(`/p/${promoCode}`),
    `code ${promoCode}`,
  );

  const publicPromo = await fetch(`${BASE}/api/public/promos/${promoCode}`);
  const publicPayload = await publicPromo.json().catch(() => null);
  const availableSlots = (publicPayload?.slots ?? []).filter((slot) => slot.available);
  check(
    "public promo page exposes slots and price",
    publicPromo.ok &&
      publicPayload?.state === "open" &&
      availableSlots.length >= 3 &&
      publicPayload?.promo?.price === "9.90",
    `${availableSlots.length} slots`,
  );

  const qr = await fetch(`${BASE}/api/public/promos/${promoCode}/qr`);
  const qrBytes = await qr.arrayBuffer();
  check(
    "promo QR returns a PNG",
    qr.ok && String(qr.headers.get("content-type")).includes("image/png") && qrBytes.byteLength > 1000,
    `${qrBytes.byteLength} bytes`,
  );

  const publicList = await fetch(`${BASE}/api/public/promos/by-business/${businessId}`);
  const publicListPayload = await publicList.json().catch(() => null);
  check(
    "microsite promo API lists the active promo",
    publicList.ok && publicListPayload?.promos?.some((promo) => promo.code === promoCode),
    `${publicListPayload?.promos?.length ?? 0} promos`,
  );

  if (micrositeSlug) {
    const microsite = await fetch(`${BASE}/api/micrositio/${micrositeSlug}`);
    const micrositePayload = await microsite.json().catch(() => null);
    check(
      "microsite exposes queue and promo display flags",
      microsite.ok &&
        micrositePayload?.desk?.showQueueOnMicrosite === true &&
        micrositePayload?.desk?.showPromosOnMicrosite === true,
      `slug ${micrositeSlug}`,
    );
  }

  const slotA = availableSlots[0]?.time;
  const slotB = availableSlots[1]?.time;
  const slotC = availableSlots[2]?.time;


  const claimA = await publicPost(`/api/public/promos/${promoCode}/claims`, {
    time: slotA,
    name: `Smoke Promo A`,
    phone: PHONE_A,
  });
  const claimAToken = claimA.payload?.claim?.token ?? null;
  check(
    "customer claims a slot (creates appointment)",
    claimA.status === 201 && Boolean(claimAToken),
    `slot ${slotA}`,
  );

  const claimLookup = await fetch(`${BASE}/api/public/promos/${promoCode}/claims/${claimAToken}`);
  const claimLookupPayload = await claimLookup.json().catch(() => null);
  check(
    "claim status is token-scoped",
    claimLookup.ok && claimLookupPayload?.status === "reserved",
    `status ${claimLookupPayload?.status}`,
  );

  const duplicateSlot = await publicPost(`/api/public/promos/${promoCode}/claims`, {
    time: slotA,
    name: "Smoke Promo Duplicate",
    phone: PHONE_B,
  });
  check("same slot cannot be claimed twice", duplicateSlot.status === 409, `status ${duplicateSlot.status}`);

  const claimB = await publicPost(`/api/public/promos/${promoCode}/claims`, {
    time: slotB,
    name: "Smoke Promo B",
    phone: PHONE_C,
  });
  check("second capacity slot is claimable", claimB.status === 201, `slot ${slotB}`);

  const overCapacity = await publicPost(`/api/public/promos/${promoCode}/claims`, {
    time: slotC,
    name: "Smoke Promo C",
    phone: PHONE_B,
  });
  check("capacity blocks the third claim", overCapacity.status === 409, `status ${overCapacity.status}`);

  const ownerPromos = await api(`/api/dashboard/businesses/${businessId}/promos`);
  const ownerPromo = ownerPromos.payload?.promos?.find((promo) => promo.code === promoCode);
  check(
    "owner list shows claims and full state",
    ownerPromos.status === 200 && ownerPromo?.claimed === 2 && ownerPromo?.state === "full",
    `${ownerPromo?.claimed}/${ownerPromo?.capacity}`,
  );

  const ownerClaims = await api(`/api/dashboard/businesses/${businessId}/promos/${promoId}/claims`);
  const claimARecord = ownerClaims.payload?.claims?.find((claim) => claim.name === "Smoke Promo A");
  check(
    "owner sees the reservations",
    ownerClaims.status === 200 && ownerClaims.payload?.claims?.length === 2,
  );

  const ownerCancel = await api(
    `/api/dashboard/businesses/${businessId}/promos/${promoId}/claims/${claimARecord?.id}/cancel`,
    "POST",
    {},
  );
  check("owner can cancel a reservation", ownerCancel.status === 200);

  const afterCancel = await fetch(`${BASE}/api/public/promos/${promoCode}`);
  const afterCancelPayload = await afterCancel.json().catch(() => null);
  check(
    "cancelled claim frees the slot and a seat",
    afterCancelPayload?.state === "open" &&
      afterCancelPayload?.promo?.remaining === 1 &&
      afterCancelPayload?.slots?.some((slot) => slot.time === slotA && slot.available),
  );

  const cancelledLookup = await fetch(`${BASE}/api/public/promos/${promoCode}/claims/${claimAToken}`);
  const cancelledPayload = await cancelledLookup.json().catch(() => null);
  check("customer sees the cancellation", cancelledPayload?.status === "cancelled");

  const botResponse = await fetch(`${BASE}/api/webhooks/whatsapp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: {
        key: { remoteJid: "51900000000@s.whatsapp.net", id: `smoke-${UNIQUE}` },
        message: { conversation: `promo ${promoCode}` },
      },
    }),
  });
  const botPayload = await botResponse.json().catch(() => null);
  check(
    "central bot replies with the promo link",
    botResponse.status === 200 &&
      botPayload?.handled === "promo" &&
      String(botPayload?.reply ?? "").includes(`/p/${promoCode}`),
    botPayload?.skipped ? "delivery skipped (no gateway key)" : "delivered",
  );

  const disabledSettings = await api(`/api/dashboard/businesses/${businessId}/desk-settings`, "PUT", {
    ...initialSettings,
    promosEnabled: false,
    showPromosOnMicrosite: false,
  });
  check("owner can disable promos", disabledSettings.status === 200 && disabledSettings.payload?.promosEnabled === false);

  const disabledPublic = await fetch(`${BASE}/api/public/promos/${promoCode}`);
  const disabledPayload = await disabledPublic.json().catch(() => null);
  check(
    "public page reflects disabled promos",
    disabledPayload?.state === "disabled" && Boolean(disabledPayload?.closedReason),
  );

  const disabledList = await fetch(`${BASE}/api/public/promos/by-business/${businessId}`);
  const disabledListPayload = await disabledList.json().catch(() => null);
  check("microsite promo API respects the toggle", disabledListPayload?.promosEnabled === false);

  if (micrositeSlug) {
    const disabledMicrosite = await fetch(`${BASE}/api/micrositio/${micrositeSlug}`);
    const disabledMicrositePayload = await disabledMicrosite.json().catch(() => null);
    check(
      "microsite hides promos when the owner disables them",
      disabledMicrositePayload?.desk?.showPromosOnMicrosite === false,
    );
  }

  const restored = await api(`/api/dashboard/businesses/${businessId}/desk-settings`, "PUT", initialSettings);
  check("promo settings restored", restored.status === 200 && restored.payload?.promosEnabled === initialSettings.promosEnabled);
} finally {
  await cleanup();
  await sql.end();
}

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
