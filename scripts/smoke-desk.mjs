/**
 * End-to-end smoke test for the owner desk (Phase 1):
 * login → seat a walk-in → finish & collect → cash summary → cleanup.
 *
 * Usage:  node scripts/smoke-desk.mjs      (server must be running on :5000)
 */
import dotenv from "dotenv";
dotenv.config();

const BASE = process.env.SMOKE_BASE_URL || "http://localhost:5000";
const EMAIL = process.env.SMOKE_EMAIL || "demo@micita.pe";
const PASSWORD = process.env.SMOKE_PASSWORD || "DemoMiCita2026!";

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

let token = "";
let csrfToken = "";

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

// Double-submit CSRF: any GET issues the `micita_csrf` cookie, which must be
// echoed in `x-csrf-token` for cookie-authenticated mutations (login).
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
    ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
  },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
const loginPayload = await login.json().catch(() => null);
token = loginPayload?.accessToken ?? "";
check("login", login.ok && Boolean(token), `status ${login.status}`);

const businesses = await api("/api/dashboard/businesses");
const businessId = businesses.payload?.[0]?.id;
check("business list", businesses.status === 200 && Boolean(businessId), `business ${businessId}`);

const today = await api(`/api/dashboard/businesses/${businessId}/today`);
check("today endpoint", today.status === 200 && Boolean(today.payload?.cash), `date ${today.payload?.date}`);

const service = today.payload?.services?.[0];
check("has a service to seat", Boolean(service), service?.name ?? "none");

let appointmentId = null;
let clientId = null;
let transactionId = null;

if (service) {
  const walkIn = await api(`/api/dashboard/businesses/${businessId}/walk-ins`, "POST", {
    serviceId: service.id,
    name: "Smoke Test Desk",
    force: true,
  });
  appointmentId = walkIn.payload?.appointment?.id ?? null;
  clientId = walkIn.payload?.client?.id ?? null;
  check(
    "walk-in creates in_progress appointment (source=walk_in)",
    walkIn.status === 201 && walkIn.payload?.appointment?.status === "in_progress" && walkIn.payload?.appointment?.source === "walk_in",
    `appointment ${appointmentId}`,
  );

  const afterSeat = await api(`/api/dashboard/businesses/${businessId}/today`);
  check("chair reports busy", afterSeat.payload?.chair?.busy === true, `until ${afterSeat.payload?.chair?.until}`);

  const finish = await api(
    `/api/dashboard/businesses/${businessId}/appointments/${appointmentId}/finish`,
    "PATCH",
    { method: "yape", amount: 20, note: "smoke" },
  );
  transactionId = finish.payload?.transaction?.id ?? null;
  check(
    "finish completes appointment and logs Yape income",
    finish.status === 200 &&
      finish.payload?.appointment?.status === "completed" &&
      Boolean(transactionId),
    `transaction ${transactionId}`,
  );

  const summary = await api(`/api/dashboard/businesses/${businessId}/cashflow/summary`);
  const yape = summary.payload?.byMethod?.find((entry) => entry.method === "yape");
  check(
    "cash summary includes the Yape entry",
    summary.status === 200 && (yape?.total ?? 0) >= 20,
    `total ${summary.payload?.total}`,
  );
}

// --- cleanup so the demo dashboard is left untouched -------------------------
if (transactionId) {
  const deleted = await api(`/api/dashboard/businesses/${businessId}/cashflow/transactions/${transactionId}`, "DELETE");
  check("cleanup transaction", deleted.status === 200);
}
if (appointmentId) {
  const deleted = await api(`/api/dashboard/businesses/${businessId}/appointments/${appointmentId}`, "DELETE");
  check("cleanup appointment", deleted.status === 200);
}
if (clientId) {
  const deleted = await api(`/api/dashboard/clients/${clientId}`, "DELETE");
  check("cleanup client", deleted.status === 200);
}

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
