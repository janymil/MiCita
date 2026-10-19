import argon2 from "argon2";
import bcrypt from "bcryptjs";
import { config } from "../config.js";

/**
 * Password hashing with argon2id (preferred). Legacy bcrypt hashes stored by
 * the previous auth system are still verifiable and transparently upgraded.
 */

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, {
    type: argon2.argon2id,
    memoryCost: config.auth.argonMemoryCost,
    timeCost: config.auth.argonTimeCost,
    parallelism: 1,
  });
}

export async function verifyPassword(plain: string, hash: string | null): Promise<boolean> {
  if (!hash) return false;
  try {
    if (hash.startsWith("$argon2")) {
      return await argon2.verify(hash, plain);
    }
    // Legacy bcrypt hashes from the pre-self-hosted-auth era.
    if (hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$")) {
      return await bcrypt.compare(plain, hash);
    }
    // Legacy plaintext / placeholder values (e.g. "stack-auth") must never match.
    return false;
  } catch {
    return false;
  }
}

export function needsRehash(hash: string | null): boolean {
  if (!hash) return true;
  return !hash.startsWith("$argon2");
}

export interface PasswordPolicyResult {
  valid: boolean;
  errors: string[];
}

export function validatePasswordStrength(password: string): PasswordPolicyResult {
  const errors: string[] = [];
  if (password.length < 10) errors.push("Debe tener al menos 10 caracteres");
  if (!/[a-z]/.test(password)) errors.push("Debe incluir al menos una minúscula");
  if (!/[A-Z]/.test(password)) errors.push("Debe incluir al menos una mayúscula");
  if (!/[0-9]/.test(password)) errors.push("Debe incluir al menos un número");
  return { valid: errors.length === 0, errors };
}
