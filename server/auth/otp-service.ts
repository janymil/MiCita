import crypto from "crypto";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "../db.js";
import { config } from "../config.js";
import { verificationOtps } from "../../shared/schema.js";
import { generateOtpCode } from "./tokens.js";
import { sendOtpEmail } from "./email-templates.js";
import { sendOtpSms } from "./sms-transport.js";

export type OtpChannel = "email" | "phone";
export type OtpPurpose = "login" | "verify_email" | "verify_phone" | "reset_password";

export interface IssueOtpResult {
  sent: boolean;
  channel: OtpChannel;
  identifier: string;
  expiresAt: Date;
  // Only ever populated in non-production when EXPOSE_OTP_IN_RESPONSE=true.
  devCode?: string;
}

function otpSecret(): string {
  return config.auth.jwtSecret;
}

function hashCode(identifier: string, purpose: string, code: string): string {
  return crypto
    .createHmac("sha256", otpSecret())
    .update(`${identifier}:${purpose}:${code}`)
    .digest("hex");
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function issueOtp(
  identifier: string,
  channel: OtpChannel,
  purpose: OtpPurpose = "login",
): Promise<IssueOtpResult> {
  const normalized = identifier.trim().toLowerCase();
  const code = generateOtpCode(6);
  const codeHash = hashCode(normalized, purpose, code);

  // Invalidate any outstanding codes for this identifier/purpose.
  await db
    .update(verificationOtps)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(verificationOtps.identifier, normalized),
        eq(verificationOtps.purpose, purpose),
        isNull(verificationOtps.consumedAt),
      ),
    );

  const ttlMinutes = channel === "email" ? config.auth.emailOtpTtlMinutes : config.auth.phoneOtpTtlMinutes;
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  await db.insert(verificationOtps).values({
    identifier: normalized,
    channel,
    purpose,
    codeHash,
    expiresAt,
  });

  let sent = false;
  if (channel === "email") {
    sent = await sendOtpEmail(normalized, code, ttlMinutes);
  } else {
    const result = await sendOtpSms(normalized, code, ttlMinutes);
    sent = result.delivered;
    if (!sent) console.warn("[otp] SMS delivery failed:", result.detail);
  }

  return {
    sent,
    channel,
    identifier: normalized,
    expiresAt,
    devCode: config.otp.exposeInResponse ? code : undefined,
  };
}

export interface VerifyOtpResult {
  valid: boolean;
  reason?: "not_found" | "expired" | "too_many_attempts" | "mismatch";
}

export async function verifyOtp(
  identifier: string,
  code: string,
  purpose: OtpPurpose = "login",
): Promise<VerifyOtpResult> {
  const normalized = identifier.trim().toLowerCase();

  const [record] = await db
    .select()
    .from(verificationOtps)
    .where(
      and(
        eq(verificationOtps.identifier, normalized),
        eq(verificationOtps.purpose, purpose),
        isNull(verificationOtps.consumedAt),
      ),
    )
    .orderBy(desc(verificationOtps.createdAt))
    .limit(1);

  if (!record) return { valid: false, reason: "not_found" };
  if (record.expiresAt.getTime() < Date.now()) {
    await db.update(verificationOtps).set({ consumedAt: new Date() }).where(eq(verificationOtps.id, record.id));
    return { valid: false, reason: "expired" };
  }
  if (record.attempts >= record.maxAttempts) {
    await db.update(verificationOtps).set({ consumedAt: new Date() }).where(eq(verificationOtps.id, record.id));
    return { valid: false, reason: "too_many_attempts" };
  }

  const expected = hashCode(normalized, purpose, code);
  if (!timingSafeEqual(expected, record.codeHash)) {
    await db
      .update(verificationOtps)
      .set({ attempts: sql`${verificationOtps.attempts} + 1` })
      .where(eq(verificationOtps.id, record.id));
    return { valid: false, reason: "mismatch" };
  }

  await db.update(verificationOtps).set({ consumedAt: new Date() }).where(eq(verificationOtps.id, record.id));
  return { valid: true };
}

/** Seconds until an identifier may request another OTP (cooldown throttling). */
export async function otpCooldownRemaining(identifier: string, purpose: OtpPurpose): Promise<number> {
  const normalized = identifier.trim().toLowerCase();
  const [record] = await db
    .select({ createdAt: verificationOtps.createdAt })
    .from(verificationOtps)
    .where(
      and(
        eq(verificationOtps.identifier, normalized),
        eq(verificationOtps.purpose, purpose),
        gt(verificationOtps.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(verificationOtps.createdAt))
    .limit(1);

  if (!record?.createdAt) return 0;
  const cooldownMs = 45 * 1000;
  const elapsed = Date.now() - record.createdAt.getTime();
  return elapsed < cooldownMs ? Math.ceil((cooldownMs - elapsed) / 1000) : 0;
}
