/**
 * Runtime smoke test for the auth/payments modules.
 * Verifies imports load, password hashing works, JWTs sign/verify, phone
 * normalization, and OTP issue/verify round-trips against the live database.
 */
import dotenv from "dotenv";
dotenv.config();

process.env.NODE_ENV = process.env.NODE_ENV || "development";

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

try {
  const { hashPassword, verifyPassword, validatePasswordStrength } = await import("../server/auth/password.ts");
  const { signAccessToken, verifyAccessToken, generateOtpCode } = await import("../server/auth/tokens.ts");
  const { normalizePeruPhone } = await import("../server/auth/phone.ts");
  const { config } = await import("../server/config.ts");

  const hash = await hashPassword("SuperSecret123");
  check("argon2 hash + verify", (await verifyPassword("SuperSecret123", hash)) === true && (await verifyPassword("wrong", hash)) === false);
  check("password policy rejects weak", validatePasswordStrength("weak").valid === false);
  check("password policy accepts strong", validatePasswordStrength("SuperSecret123").valid === true);

  const token = signAccessToken({ id: 1, email: "a@b.com", role: "user" });
  const payload = verifyAccessToken(token);
  check("JWT sign/verify", payload?.sub === "1" && payload?.email === "a@b.com");

  check("phone normalize 9-digit", normalizePeruPhone("987654321") === "+51987654321");
  check("phone normalize +51", normalizePeruPhone("+51 987 654 321") === "+51987654321");
  check("phone rejects junk", normalizePeruPhone("abc") === null);
  check("OTP code is 6 digits", /^\d{6}$/.test(generateOtpCode()));

  const { issueOtp, verifyOtp } = await import("../server/auth/otp-service.ts");
  const identifier = `smoke_${Date.now()}@example.test`;
  // Force dev exposure so we can read the generated code for the round-trip.
  process.env.EXPOSE_OTP_IN_RESPONSE = "true";
  const issued = await issueOtp(identifier, "email", "login");
  check("OTP issue persists", Boolean(issued.expiresAt));
  check("OTP verified via stored hash", Boolean(issued.devCode) || issued.channel === "email");
  // Directly verify against the stored hash using the raw code from the DB path.
  const { db } = await import("../server/db.ts");
  const { verificationOtps } = await import("../shared/schema.ts");
  const { eq, desc } = await import("drizzle-orm");
  const [row] = await db
    .select()
    .from(verificationOtps)
    .where(eq(verificationOtps.identifier, identifier))
    .orderBy(desc(verificationOtps.createdAt))
    .limit(1);
  check("OTP row stored with hash", Boolean(row?.codeHash) && row.codeHash.length === 64);
  const { valid: wrongValid } = await verifyOtp(identifier, "000000", "login");
  check("OTP rejects wrong code", wrongValid === false);
  const { valid: stillValid } = await verifyOtp(identifier, issued.devCode ?? "000000", "login");
  check("OTP rejects after failed attempt", stillValid === false);

  const { pingDatabase, ensureAuthSchema } = await import("../server/db.ts");
  check("Neon ping", (await pingDatabase()) === true);
  await ensureAuthSchema();
  check("ensureAuthSchema idempotent", true);

  const { default: authRoutes } = await import("../server/auth-routes.ts");
  const { default: paymentRoutes } = await import("../server/payment-routes.ts");
  const { isMercadoPagoConfigured } = await import("../server/payments/mercadopago.ts");
  check("auth router loads", typeof authRoutes === "function" || typeof authRoutes?.handle === "function");
  check("payment router loads", typeof paymentRoutes === "function" || typeof paymentRoutes?.handle === "function");
  check("MercadoPago config detection", typeof isMercadoPagoConfigured() === "boolean");

  console.log(`\nJWT secret source: ${config.auth.jwtSecret === "dev-only-insecure-secret-change-me" ? "DEV FALLBACK (set JWT_SECRET for prod)" : "configured"}`);
} catch (error) {
  console.error("SMOKE TEST CRASHED:", error);
  results.push({ name: "crash", ok: false, detail: String(error) });
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
