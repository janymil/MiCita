import crypto from "crypto";
import type { NextFunction, Request, Response } from "express";
import { config } from "./config.js";

/**
 * Double-submit cookie CSRF protection.
 *
 * The server issues a non-HttpOnly `micita_csrf` cookie; the SPA echoes it in
 * the `x-csrf-token` header (see client/src/lib/auth-api.ts). Requests that
 * mutate state AND rely on cookie auth must present a matching token.
 *
 * Bearer-token requests are inherently CSRF-immune (a cross-site form cannot
 * set an Authorization header), so they are exempted.
 */
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const EXEMPT_PATHS = [
  "/api/payments/webhook",
  // Server-to-server webhook from the Formatika WhatsApp gateway: there is no
  // browser session, so double-submit CSRF cannot apply. A shared secret and
  // the rate limiter protect it instead.
  "/api/webhooks/whatsapp",
  "/api/webhooks/whatsapp/formatika",
];

export function csrfCookieMiddleware(req: Request, res: Response, next: NextFunction) {
  const existing = req.cookies?.[config.auth.csrfCookieName];
  if (!existing) {
    const token = crypto.randomBytes(24).toString("base64url");
    res.cookie(config.auth.csrfCookieName, token, {
      httpOnly: false, // must be readable by the SPA to echo it back
      secure: config.isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60 * 1000,
    });
    req.cookies = { ...(req.cookies || {}), [config.auth.csrfCookieName]: token };
  }
  next();
}

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();
  // req.path is relative to the router; use originalUrl for a stable check.
  if (EXEMPT_PATHS.some((p) => req.originalUrl.split("?")[0].endsWith(p))) return next();

  // Bearer-authenticated requests do not rely on ambient cookie credentials.
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) return next();

  const cookieToken = req.cookies?.[config.auth.csrfCookieName];
  const headerToken = req.headers["x-csrf-token"];

  if (!cookieToken || !headerToken || String(headerToken) !== String(cookieToken)) {
    return res.status(403).json({ message: "Token CSRF inválido o ausente" });
  }
  return next();
}
