import { config } from "./config.js";

import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { isDatabaseConfigured, isDatabaseHealthy, pingDatabase, ensureAuthSchema } from "./db.js";
import { csrfCookieMiddleware, csrfProtection } from "./csrf.js";

const app = express();

// Behind a reverse proxy (Render/Neon/Fly/nginx) so rate limiting sees real IPs.
app.set("trust proxy", config.security.trustProxy);

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://maps.googleapis.com", "https://sdk.mercadopago.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        connectSrc: [
          "'self'",
          "https://maps.googleapis.com",
          "https://api.mercadopago.com",
          ...(config.isProduction ? [] : ["ws:", "wss:"]),
        ],
        frameSrc: ["'self'", "https://www.mercadopago.com", "https://www.mercadopago.pe"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'", "https://www.mercadopago.com", "https://www.mercadopago.pe"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: config.isProduction ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  }),
);

// CORS - allow the configured origins; in development accept any local origin
// (localhost, 127.0.0.1, ::1, LAN IPs used by previews) so the app never breaks
// because of a hostname mismatch.
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || config.isDevelopment || config.allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-csrf-token", "x-request-id", "x-signature", "x-idempotency-key"],
    maxAge: 86400,
  }),
);

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: config.security.apiRateLimitWindowMinutes * 60 * 1000,
  max: config.security.apiRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Demasiadas solicitudes. Intenta de nuevo más tarde." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.security.authRateLimitMax,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
});

const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 100,
  delayMs: () => 300,
});

app.use("/api/", apiLimiter);
app.use("/api/", speedLimiter);
app.use("/api/auth/", authLimiter);

// MercadoPago posts raw JSON; capture it before the global JSON parser.
app.use("/api/payments/webhook", express.raw({ type: "*/*", limit: "1mb" }));

// Body parsing - tighter default limit than the Express 100kb for JSON APIs.
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(cookieParser());

// CSRF: issue the double-submit cookie, then require it on mutating requests.
// The payment webhook is exempt (no cookies; authenticated via signature).
app.use(csrfCookieMiddleware);
app.use(csrfProtection);

// Request logging (redacts sensitive JSON payloads such as tokens/passwords).
const REDACT_KEYS = /password|token|secret|otp|code|authorization/i;
function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, REDACT_KEYS.test(k) ? "[redacted]" : redact(v)]));
  }
  return value;
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, unknown> | undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse && !config.isProduction) {
        logLine += ` :: ${JSON.stringify(redact(capturedJsonResponse))}`;
      }
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
      log(logLine);
    }
  });

  next();
});

(async () => {
  // Liveness/readiness probe.
  app.get("/api/health", async (_req, res) => {
    const dbOk = isDatabaseConfigured() ? await pingDatabase() : false;
    res.status(dbOk || !isDatabaseConfigured() ? 200 : 503).json({
      status: dbOk ? "ok" : "degraded",
      database: isDatabaseConfigured() ? (dbOk ? "up" : "down") : "not-configured",
      healthy: isDatabaseHealthy(),
      env: config.nodeEnv,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  if (isDatabaseConfigured()) {
    const ok = await pingDatabase();
    log(ok ? "Database connection established (Neon/Postgres)" : "Database ping failed at startup");
    if (ok) {
      try {
        await ensureAuthSchema();
      } catch (error: any) {
        log("Additive auth schema setup failed: " + String(error));
      }
    }
  } else {
    log("No DATABASE_URL found - running without a database");
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    console.error("Server error:", err);
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Omit the host so Node binds dual-stack (IPv4 + IPv6); this makes both
  // `localhost` (::1) and `127.0.0.1` reach the app.
  server.listen(config.port, () => {
    log(`serving on port ${config.port} (${config.nodeEnv})`);
  });

  const shutdown = async (signal: string) => {
    log(`received ${signal}, shutting down gracefully`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
})();
