import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "./auth/tokens.js";
import { findUserById } from "./auth/account-service.js";
import type { User } from "../shared/schema.js";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  dbUser?: User;
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    return header.slice(7).trim();
  }
  // Also accept the legacy header for backward compatibility with cached clients.
  const legacy = req.headers["x-stack-access-token"];
  if (typeof legacy === "string" && legacy) return legacy;
  return null;
}

async function resolveUser(req: AuthenticatedRequest): Promise<AuthUser | null> {
  const token = extractToken(req);
  if (!token) return null;

  const payload = verifyAccessToken(token);
  if (!payload) return null;

  const userId = Number(payload.sub);
  if (!Number.isFinite(userId)) return null;

  const user = await findUserById(userId);
  if (!user || user.isActive === false) return null;

  req.dbUser = user;
  return { id: user.id, email: user.email, name: user.name, role: user.role ?? "user" };
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = await resolveUser(req);
    if (!user) {
      return res.status(401).json({ message: "No autorizado" });
    }
    req.user = user;
    next();
  } catch (error: any) {
    console.error("[auth] requireAuth error:", error);
    return res.status(401).json({ message: "Autenticación fallida" });
  }
}

export async function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  try {
    const user = await resolveUser(req);
    if (user) req.user = user;
  } catch {
    // Anonymous requests continue without a user.
  }
  next();
}

export async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = await resolveUser(req);
    if (!user) return res.status(401).json({ message: "No autorizado" });

    const { config } = await import("./config.js");
    const isAdminRole = user.role === "admin";
    const isAllowedEmail = config.admin.allowedEmails.includes(user.email.toLowerCase());
    if (!isAdminRole && !isAllowedEmail) {
      return res.status(403).json({ message: "Acceso denegado" });
    }

    req.user = user;
    next();
  } catch (error: any) {
    console.error("[auth] requireAdmin error:", error);
    return res.status(403).json({ message: "Acceso denegado" });
  }
}
