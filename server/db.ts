import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as schema from "../shared/schema.js";
import { config } from "./config.js";

// Database connection. Neon (production) is reached over the pooled host with TLS.
const connectionString = config.database.url;

if (!connectionString) {
  throw new Error(
    "[db] DATABASE_URL environment variable is required. Point it at your Neon pooled connection string.",
  );
}

const isNeon = /neon\.tech/.test(connectionString);

export const sql = postgres(connectionString, {
  max: config.database.poolMax,
  idle_timeout: config.database.idleTimeoutSeconds,
  connect_timeout: config.database.connectTimeoutSeconds,
  // Neon requires TLS; local docker/postgres usually does not.
  ssl: isNeon || config.isProduction ? { rejectUnauthorized: false } : undefined,
  onnotice: config.isDevelopment ? () => {} : undefined,
});

export const db = drizzle(sql, { schema });

let healthy = false;

export function isDatabaseConfigured(): boolean {
  return Boolean(connectionString);
}

export function isDatabaseHealthy(): boolean {
  return healthy;
}

/** Lightweight liveness probe used by /api/health. */
export async function pingDatabase(): Promise<boolean> {
  try {
    await sql`select 1`;
    healthy = true;
    return true;
  } catch (error: any) {
    healthy = false;
    return false;
  }
}

export async function runMigrations() {
  console.log("[db] Running database migrations...");
  await migrate(db, { migrationsFolder: "./migrations" });
  console.log("[db] Migrations completed successfully");
}

/**
 * Apply the additive auth/payments schema at startup (idempotent, never drops
 * or mutates existing data). Mirrors scripts/ensure-auth-schema.mjs so a fresh
 * deployment self-provisions its tables.
 */
export async function ensureAuthSchema(): Promise<void> {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(here, "..", "scripts", "ensure-auth-schema.mjs"),
    path.join(process.cwd(), "scripts", "ensure-auth-schema.mjs"),
  ];
  const scriptPath = candidates.find((p) => fs.existsSync(p));
  if (!scriptPath) {
    console.warn("[db] ensure-auth-schema.mjs not found; skipping additive schema setup");
    return;
  }
  try {
    const mod = await import(`file://${scriptPath.replace(/\\/g, "/")}`);
    const statements = (mod as { statements?: string[] }).statements ?? [];
    let applied = 0;
    for (const statement of statements) {
      try {
        await sql.unsafe(statement);
        applied += 1;
      } catch (error: any) {
        const message = error instanceof Error ? error.message : String(error);
        if (!/already exists|duplicate/i.test(message)) throw error;
      }
    }
    console.log(`[db] Additive auth schema ensured (${applied} statements).`);
  } catch (error: any) {
    console.error("[db] Failed to ensure auth schema:", error);
    if (config.isProduction) throw error;
  }
}

export async function closeConnection() {
  await sql.end({ timeout: 5 });
}

export { schema };
