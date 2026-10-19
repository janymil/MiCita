import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db.js";
import { refreshTokens } from "../../shared/schema.js";
import { generateFamilyId, generateJti, hashOpaqueToken, signRefreshToken, verifyRefreshToken } from "./tokens.js";

export interface IssuedRefreshToken {
  token: string;
  expiresAt: Date;
  familyId: string;
  jti: string;
}

export async function issueRefreshToken(
  userId: number,
  context: { userAgent?: string | null; ip?: string | null },
  familyId?: string,
): Promise<IssuedRefreshToken> {
  const jti = generateJti();
  const family = familyId ?? generateFamilyId();
  const { token, expiresAt } = signRefreshToken(userId, jti, family);

  await db.insert(refreshTokens).values({
    userId,
    tokenHash: hashOpaqueToken(token),
    familyId: family,
    userAgent: context.userAgent ?? null,
    ip: context.ip ?? null,
    expiresAt,
  });

  return { token, expiresAt, familyId: family, jti };
}

export type RotateResult =
  | { ok: true; userId: number; refresh: IssuedRefreshToken }
  | { ok: false; reason: "invalid" | "expired" | "revoked" | "reuse" };

/**
 * Rotate a refresh token. If an already-revoked token is presented, the whole
 * family is revoked (refresh-token reuse detection).
 */
export async function rotateRefreshToken(
  presentedToken: string,
  context: { userAgent?: string | null; ip?: string | null },
): Promise<RotateResult> {
  const payload = verifyRefreshToken(presentedToken);
  if (!payload) return { ok: false, reason: "invalid" };

  const tokenHash = hashOpaqueToken(presentedToken);
  const [record] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, tokenHash))
    .limit(1);

  if (!record) return { ok: false, reason: "invalid" };
  if (record.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };

  if (record.revokedAt) {
    // Reuse of a rotated token: assume compromise and kill the family.
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.familyId, record.familyId), isNull(refreshTokens.revokedAt)));
    return { ok: false, reason: "reuse" };
  }

  const userId = Number(payload.sub);
  const refresh = await issueRefreshToken(userId, context, record.familyId);

  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.id, record.id));

  return { ok: true, userId, refresh };
}

export async function revokeRefreshToken(presentedToken: string): Promise<void> {
  const tokenHash = hashOpaqueToken(presentedToken);
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt)));
}

export async function revokeAllUserTokens(userId: number): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
}
