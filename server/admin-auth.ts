import crypto from "crypto";
import type { NextFunction, Request, Response } from "express";
import { requireAdmin } from "./auth-middleware.js";
import { config } from "./config.js";

/**
 * Admin gate shared by all admin routers.
 *
 * Accepts either:
 *  - an authenticated user with role=admin or an allow-listed email, or
 *  - the legacy `Bearer <ADMIN_PASSWORD>` token (constant-time compared).
 *
 * In production ADMIN_PASSWORD has no insecure default, so this is only usable
 * when the operator explicitly sets it. Prefer the authenticated admin role.
 */
export function adminAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (config.admin.password && token) {
    const a = Buffer.from(token);
    const b = Buffer.from(config.admin.password);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      return next();
    }
  }

  return requireAdmin(req as any, res, next);
}
