import crypto from "crypto";
import jwt, { type SignOptions } from "jsonwebtoken";
import { config } from "../config.js";
import type { User } from "../../shared/schema.js";

export type TokenPurpose = "access" | "refresh";

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
  type: "access";
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  familyId: string;
  type: "refresh";
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

function baseOptions(): SignOptions {
  return {
    issuer: config.auth.jwtIssuer,
    audience: config.auth.jwtAudience,
  };
}

export function signAccessToken(user: Pick<User, "id" | "email" | "role">): string {
  const payload: AccessTokenPayload = {
    sub: String(user.id),
    email: user.email,
    role: user.role ?? "user",
    type: "access",
  };
  return jwt.sign(payload, config.auth.jwtSecret, {
    ...baseOptions(),
    expiresIn: config.auth.accessTokenTtl as SignOptions["expiresIn"],
  });
}

export function signRefreshToken(
  userId: number,
  jti: string,
  familyId: string,
): { token: string; expiresAt: Date } {
  const payload: RefreshTokenPayload = { sub: String(userId), jti, familyId, type: "refresh" };
  const token = jwt.sign(payload, config.auth.jwtSecret, {
    ...baseOptions(),
    expiresIn: `${config.auth.refreshTokenTtlDays}d`,
  });
  const expiresAt = new Date(Date.now() + config.auth.refreshTokenTtlDays * 24 * 60 * 60 * 1000);
  return { token, expiresAt };
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const decoded = jwt.verify(token, config.auth.jwtSecret, {
      issuer: config.auth.jwtIssuer,
      audience: config.auth.jwtAudience,
    }) as AccessTokenPayload;
    if (decoded.type !== "access") return null;
    return decoded;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    const decoded = jwt.verify(token, config.auth.jwtSecret, {
      issuer: config.auth.jwtIssuer,
      audience: config.auth.jwtAudience,
    }) as RefreshTokenPayload;
    if (decoded.type !== "refresh") return null;
    return decoded;
  } catch {
    return null;
  }
}

export function generateOpaqueToken(bytes = 48): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function generateOtpCode(digits = 6): string {
  const max = 10 ** digits;
  const value = crypto.randomInt(0, max);
  return value.toString().padStart(digits, "0");
}

/** Deterministic high-entropy hash so OTP/token lookups are index-able. */
export function hashOpaqueToken(token: string): string {
  return crypto.createHmac("sha256", config.auth.jwtSecret).update(token).digest("hex");
}

export function generateJti(): string {
  return crypto.randomUUID();
}

export function generateFamilyId(): string {
  return crypto.randomUUID();
}
