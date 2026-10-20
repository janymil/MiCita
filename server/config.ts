import dotenv from "dotenv";

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") {
    throw new Error(
      `[config] Missing required environment variable: ${name}. See .env.example for the full list.`,
    );
  }
  return value;
}

function optionalNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Support `--port <n>` (used by preview/dev runners) in addition to PORT.
 * Example: `tsx server/index.ts --port 32103`.
 */
function cliPort(): number | undefined {
  const args = process.argv;
  const flagIndex = args.findIndex((arg) => arg === "--port" || arg === "-p");
  const inline = args.find((arg) => arg.startsWith("--port="));
  const raw = inline ? inline.split("=")[1] : flagIndex >= 0 ? args[flagIndex + 1] : undefined;
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 && parsed < 65536 ? parsed : undefined;
}

const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";

// Fail fast in production if the app is fundamentally misconfigured.
if (isProduction) {
  const missing: string[] = [];
  if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
  if (!process.env.JWT_SECRET) missing.push("JWT_SECRET");
  if (missing.length) {
    throw new Error(
      `[config] Missing production environment variables: ${missing.join(", ")}. Refusing to start.`,
    );
  }
}

const devSecret = "dev-only-insecure-secret-change-me";

export const config = {
  nodeEnv,
  isProduction,
  isDevelopment: !isProduction,
  port: cliPort() ?? optionalNumber("PORT", 5000),
  appUrl: process.env.APP_URL || (isProduction ? "https://micita.pe" : "http://localhost:5000"),
  allowedOrigins: (
    process.env.ALLOWED_ORIGINS ||
    (isProduction ? "https://micita.pe,https://www.micita.pe" : "http://localhost:5000,http://localhost:5173")
  )
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),

  database: {
    url: process.env.DATABASE_URL || "",
    poolMax: optionalNumber("DATABASE_POOL_MAX", 10),
    idleTimeoutSeconds: optionalNumber("DATABASE_IDLE_TIMEOUT", 20),
    connectTimeoutSeconds: optionalNumber("DATABASE_CONNECT_TIMEOUT", 15),
  },

  auth: {
    jwtSecret: process.env.JWT_SECRET || (isProduction ? "" : devSecret),
    jwtIssuer: process.env.JWT_ISSUER || "micita",
    jwtAudience: process.env.JWT_AUDIENCE || "micita-app",
    accessTokenTtl: process.env.ACCESS_TOKEN_TTL || "15m",
    refreshTokenTtlDays: optionalNumber("REFRESH_TOKEN_TTL_DAYS", 30),
    resetTokenTtlMinutes: optionalNumber("RESET_TOKEN_TTL_MINUTES", 30),
    emailOtpTtlMinutes: optionalNumber("EMAIL_OTP_TTL_MINUTES", 10),
    phoneOtpTtlMinutes: optionalNumber("PHONE_OTP_TTL_MINUTES", 10),
    otpTtlSeconds: optionalNumber("OTP_TTL_SECONDS", 300),
    cookieName: process.env.REFRESH_COOKIE_NAME || "micita_rt",
    cookieDomain: process.env.COOKIE_DOMAIN || undefined,
    csrfCookieName: process.env.CSRF_COOKIE_NAME || "micita_csrf",
    bcryptRounds: optionalNumber("BCRYPT_ROUNDS", 12),
    argonMemoryCost: optionalNumber("ARGON_MEMORY_COST", 19456),
    argonTimeCost: optionalNumber("ARGON_TIME_COST", 2),
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    redirectUri:
      process.env.GOOGLE_REDIRECT_URI || `${process.env.APP_URL || "http://localhost:5000"}/api/auth/google/callback`,
  },

  otp: {
    // Console driver logs codes to the server log - only acceptable outside production.
    emailDriver: process.env.EMAIL_OTP_DRIVER || (isProduction ? "smtp" : "console"),
    phoneDriver: process.env.PHONE_OTP_DRIVER || (isProduction ? "console" : "console"),
    exposeInResponse: process.env.EXPOSE_OTP_IN_RESPONSE === "true" && !isProduction,
  },

  email: {
    // Reusable SMTP transport (nodemailer) used for OTP + notifications.
    host: process.env.EMAIL_HOST || process.env.SMTP_HOST || "smtp.hostinger.com",
    port: optionalNumber("EMAIL_PORT", optionalNumber("SMTP_PORT", 465)),
    secure: (process.env.EMAIL_SECURE || "true") !== "false",
    user: process.env.EMAIL_USER || process.env.SMTP_USER || "",
    pass: process.env.EMAIL_PASS || process.env.SMTP_PASS || "",
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER || "no-reply@micita.pe",
    fromName: process.env.EMAIL_FROM_NAME || "MiCita",
  },

  sms: {
    // provider-agnostic SMS/WhatsApp abstraction; "console" logs, "webhook" posts to a bridge.
    provider: (process.env.SMS_PROVIDER || "console") as "console" | "twilio" | "webhook",
    webhookUrl: process.env.SMS_WEBHOOK_URL || "",
    webhookToken: process.env.SMS_WEBHOOK_TOKEN || "",
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID || "",
      authToken: process.env.TWILIO_AUTH_TOKEN || "",
      from: process.env.TWILIO_PHONE_NUMBER || "",
      whatsappFrom: process.env.TWILIO_WHATSAPP_NUMBER || "",
    },
  },

  whatsapp: {
    // Central service bot: the platform owns one WhatsApp number (linked to the
    // Formatika gateway). Businesses never link their personal number.
    // FORMATIKA_BASE_URL is the production/local alias (`http://127.0.0.1:8790`)
    // and takes precedence; FORMATIKA_API_URL stays supported for deployments
    // that only set the old variable.
    apiUrl:
      process.env.FORMATIKA_BASE_URL ||
      process.env.FORMATIKA_API_URL ||
      "https://msg.formatika.dev",
    apiKey: process.env.FORMATIKA_API_KEY || "",
    webhookSecret: process.env.FORMATIKA_WEBHOOK_SECRET || "",
    botNumber: process.env.WHATSAPP_BOT_NUMBER || "",
  },

  payments: {
    provider: (process.env.PAYMENT_PROVIDER || "mercadopago") as "mercadopago",
    mercadoPago: {
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || "",
      publicKey: process.env.MERCADOPAGO_PUBLIC_KEY || "",
      clientId: process.env.MERCADOPAGO_CLIENT_ID || "",
      clientSecret: process.env.MERCADOPAGO_CLIENT_SECRET || "",
      webhookSecret: process.env.MERCADOPAGO_WEBHOOK_SECRET || "",
      sandbox: process.env.MERCADOPAGO_SANDBOX === "true" || !isProduction,
      successUrl: process.env.MERCADOPAGO_SUCCESS_URL || "/dashboard/finanzas?payment=success",
      failureUrl: process.env.MERCADOPAGO_FAILURE_URL || "/dashboard/finanzas?payment=failure",
      pendingUrl: process.env.MERCADOPAGO_PENDING_URL || "/dashboard/finanzas?payment=pending",
    },
  },

  admin: {
    // No insecure fallback in production. If unset, admin routes stay locked.
    password: process.env.ADMIN_PASSWORD || (isProduction ? "" : "admin123"),
    allowedEmails: (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean),
  },

  security: {
    trustProxy: optionalNumber("TRUST_PROXY", isProduction ? 1 : 0),
    apiRateLimitWindowMinutes: optionalNumber("API_RATE_LIMIT_WINDOW_MIN", 15),
    apiRateLimitMax: optionalNumber("API_RATE_LIMIT_MAX", 300),
    authRateLimitMax: optionalNumber("AUTH_RATE_LIMIT_MAX", 10),
    otpRateLimitMax: optionalNumber("OTP_RATE_LIMIT_MAX", 5),
  },

  uploads: {
    dir: process.env.UPLOADS_DIR || "uploads",
    maxFileSizeBytes: optionalNumber("UPLOAD_MAX_BYTES", 5 * 1024 * 1024),
  },
} as const;

export type AppConfig = typeof config;
