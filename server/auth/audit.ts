import type { Request } from "express";
import { db } from "../db.js";
import { authAuditLog } from "../../shared/schema.js";

export type AuditEvent =
  | "register"
  | "login_success"
  | "login_failed"
  | "logout"
  | "token_refresh"
  | "token_refresh_failed"
  | "otp_sent"
  | "otp_verified"
  | "otp_failed"
  | "password_reset_requested"
  | "password_reset_completed"
  | "password_changed"
  | "email_verified"
  | "phone_verified"
  | "google_login"
  | "account_locked"
  | "payment_created"
  | "payment_approved"
  | "payment_rejected";

export interface AuditInput {
  userId?: number | null;
  email?: string | null;
  event: AuditEvent;
  provider?: string | null;
  metadata?: Record<string, unknown>;
}

export function clientIp(req: Request): string | null {
  const forwarded = (req.headers["x-forwarded-for"] as string) || "";
  const first = forwarded.split(",")[0]?.trim();
  return first || req.ip || null;
}

export async function recordAudit(req: Request, input: AuditInput): Promise<void> {
  try {
    await db.insert(authAuditLog).values({
      userId: input.userId ?? null,
      email: input.email ?? null,
      event: input.event,
      provider: input.provider ?? null,
      ip: clientIp(req),
      userAgent: (req.headers["user-agent"] as string) || null,
      metadata: input.metadata ?? null,
    });
  } catch (error: any) {
    // Auditing must never break the request path.
    console.error("[audit] Failed to record event:", error);
  }
}
