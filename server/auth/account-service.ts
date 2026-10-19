import { and, eq } from "drizzle-orm";
import { db } from "../db.js";
import { authIdentities, users, type PublicUser, type User } from "../../shared/schema.js";

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    role: user.role ?? "user",
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    createdAt: user.createdAt,
  };
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()))
    .limit(1);
  return user;
}

export async function findUserById(id: number): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user;
}

export async function findUserByPhone(phone: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  return user;
}

export async function findUserByIdentity(
  provider: string,
  providerAccountId: string,
): Promise<User | undefined> {
  const [row] = await db
    .select({ user: users })
    .from(authIdentities)
    .innerJoin(users, eq(authIdentities.userId, users.id))
    .where(
      and(
        eq(authIdentities.provider, provider),
        eq(authIdentities.providerAccountId, providerAccountId),
      ),
    )
    .limit(1);
  return row?.user;
}

export async function linkIdentity(userId: number, provider: string, providerAccountId: string): Promise<void> {
  const normalized = providerAccountId.trim().toLowerCase();
  const existing = await findUserByIdentity(provider, normalized);
  if (existing) return;
  await db
    .insert(authIdentities)
    .values({ userId, provider, providerAccountId: normalized })
    .onConflictDoNothing();
}

export interface CreateUserInput {
  email: string;
  name: string;
  passwordHash?: string | null;
  phone?: string | null;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  avatarUrl?: string | null;
  provider: string;
  providerAccountId?: string;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const email = input.email.trim().toLowerCase();
  const [user] = await db
    .insert(users)
    .values({
      email,
      name: input.name?.trim() || email.split("@")[0],
      password: input.passwordHash ?? null,
      phone: input.phone ?? null,
      emailVerified: input.emailVerified ?? false,
      phoneVerified: input.phoneVerified ?? false,
      avatarUrl: input.avatarUrl ?? null,
    })
    .returning();

  await linkIdentity(user.id, input.provider, input.providerAccountId ?? email);
  return user;
}

/**
 * Find-or-create used by OAuth and OTP flows: if the account exists we link the
 * new identity and fill in any missing profile fields.
 */
export async function findOrCreateUser(
  email: string,
  provider: string,
  profile: { name?: string; avatarUrl?: string | null; providerAccountId?: string; emailVerified?: boolean },
): Promise<User> {
  const normalizedEmail = email.trim().toLowerCase();
  const existing =
    (await findUserByEmail(normalizedEmail)) ?? (await findUserByIdentity(provider, profile.providerAccountId ?? normalizedEmail));

  if (existing) {
    const updates: Partial<User> = {};
    if (!existing.avatarUrl && profile.avatarUrl) updates.avatarUrl = profile.avatarUrl;
    if (!existing.emailVerified && profile.emailVerified) updates.emailVerified = true;
    if (profile.name && (!existing.name || existing.name.length === 0)) updates.name = profile.name;
    if (Object.keys(updates).length > 0) {
      await db.update(users).set(updates).where(eq(users.id, existing.id));
    }
    await linkIdentity(existing.id, provider, profile.providerAccountId ?? normalizedEmail);
    return { ...existing, ...updates };
  }

  return createUser({
    email: normalizedEmail,
    name: profile.name || normalizedEmail.split("@")[0],
    provider,
    providerAccountId: profile.providerAccountId ?? normalizedEmail,
    avatarUrl: profile.avatarUrl ?? null,
    emailVerified: profile.emailVerified ?? false,
  });
}

export async function setUserPassword(userId: number, passwordHash: string): Promise<void> {
  await db.update(users).set({ password: passwordHash }).where(eq(users.id, userId));
  // Ensure a password identity exists for the account.
  const user = await findUserById(userId);
  if (user) await linkIdentity(userId, "password", user.email);
}

export async function markEmailVerified(userId: number, email?: string): Promise<void> {
  await db.update(users).set({ emailVerified: true }).where(eq(users.id, userId));
  if (email) await linkIdentity(userId, "email_otp", email);
}

export async function markPhoneVerified(userId: number, phone: string): Promise<void> {
  await db.update(users).set({ phoneVerified: true, phone }).where(eq(users.id, userId));
  await linkIdentity(userId, "phone_otp", phone);
}

export async function recordLogin(userId: number): Promise<void> {
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId));
}
