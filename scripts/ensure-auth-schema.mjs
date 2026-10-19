/**
 * Idempotent schema setup for the auth + payments tables.
 *
 * This project stores its schema in `shared/schema.ts` (Drizzle) and normally
 * applies changes with `drizzle-kit push`. Because the production Neon database
 * already holds live data and the operator asked for no destructive migrations,
 * this script creates only ADDITIVE, missing objects using IF NOT EXISTS and
 * never drops or alters existing columns/tables.
 *
 * Usage:  node scripts/ensure-auth-schema.mjs
 * It is also invoked automatically at server startup (see server/db.ts) so a
 * fresh deploy is self-provisioning.
 */
import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("[ensure-schema] DATABASE_URL is not set");
  process.exit(1);
}

const isNeon = /neon\.tech/.test(connectionString);
const sql = postgres(connectionString, {
  max: 1,
  ssl: isNeon || process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});

const statements = [
    // --- users: additive columns (never drop the legacy `stack_auth_id`) -------
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" text`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone_verified" boolean DEFAULT false`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified" boolean DEFAULT false`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" text`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" text NOT NULL DEFAULT 'user'`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_login_at" timestamp`,
  // Self-hosted auth requires nullable passwords for phone/Google-only accounts.
  `ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL`,

  // --- apify_businesses: admin active/inactive toggle ----------------------
  `ALTER TABLE "apify_businesses" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true`,

  // --- business_settings: microsite editor fields --------------------------
  `ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "website_url" text`,
  `ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "whatsapp_number" text`,
  `ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "monday_hours" text`,
  `ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "tuesday_hours" text`,
  `ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "wednesday_hours" text`,
  `ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "thursday_hours" text`,
  `ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "friday_hours" text`,
  `ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "saturday_hours" text`,
  `ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "sunday_hours" text`,
  `ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "gallery" jsonb DEFAULT '[]'::jsonb`,

  // --- auth_identities ------------------------------------------------------
  `CREATE TABLE IF NOT EXISTS "auth_identities" (
     "id" serial PRIMARY KEY,
     "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
     "provider" text NOT NULL,
     "provider_account_id" text NOT NULL,
     "created_at" timestamp DEFAULT now()
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "auth_identities_provider_account_uq"
     ON "auth_identities" ("provider", "provider_account_id")`,

  // --- verification_otps ----------------------------------------------------
  `CREATE TABLE IF NOT EXISTS "verification_otps" (
     "id" serial PRIMARY KEY,
     "identifier" text NOT NULL,
     "channel" text NOT NULL,
     "purpose" text NOT NULL DEFAULT 'login',
     "code_hash" text NOT NULL,
     "attempts" integer NOT NULL DEFAULT 0,
     "max_attempts" integer NOT NULL DEFAULT 5,
     "consumed_at" timestamp,
     "expires_at" timestamp NOT NULL,
     "created_at" timestamp DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS "verification_otps_identifier_idx"
     ON "verification_otps" ("identifier", "purpose")`,

  // --- refresh_tokens -------------------------------------------------------
  `CREATE TABLE IF NOT EXISTS "refresh_tokens" (
     "id" serial PRIMARY KEY,
     "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
     "token_hash" text NOT NULL,
     "family_id" text NOT NULL,
     "user_agent" text,
     "ip" text,
     "revoked_at" timestamp,
     "expires_at" timestamp NOT NULL,
     "created_at" timestamp DEFAULT now()
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "refresh_tokens_hash_uq" ON "refresh_tokens" ("token_hash")`,
  `CREATE INDEX IF NOT EXISTS "refresh_tokens_user_idx" ON "refresh_tokens" ("user_id")`,

  // --- password_reset_tokens ------------------------------------------------
  `CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
     "id" serial PRIMARY KEY,
     "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
     "token_hash" text NOT NULL,
     "used_at" timestamp,
     "expires_at" timestamp NOT NULL,
     "created_at" timestamp DEFAULT now()
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_tokens_hash_uq" ON "password_reset_tokens" ("token_hash")`,

  // --- email_verification_tokens -------------------------------------------
  `CREATE TABLE IF NOT EXISTS "email_verification_tokens" (
     "id" serial PRIMARY KEY,
     "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
     "token_hash" text NOT NULL,
     "used_at" timestamp,
     "expires_at" timestamp NOT NULL,
     "created_at" timestamp DEFAULT now()
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "email_verification_tokens_hash_uq" ON "email_verification_tokens" ("token_hash")`,

  // --- auth_audit_log -------------------------------------------------------
  `CREATE TABLE IF NOT EXISTS "auth_audit_log" (
     "id" serial PRIMARY KEY,
     "user_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
     "email" text,
     "event" text NOT NULL,
     "provider" text,
     "ip" text,
     "user_agent" text,
     "metadata" jsonb,
     "created_at" timestamp DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS "auth_audit_log_event_idx" ON "auth_audit_log" ("event")`,
  `CREATE INDEX IF NOT EXISTS "auth_audit_log_user_idx" ON "auth_audit_log" ("user_id")`,

  // --- payments -------------------------------------------------------------
  `CREATE TABLE IF NOT EXISTS "payments" (
     "id" serial PRIMARY KEY,
     "user_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
     "business_id" integer REFERENCES "businesses"("id") ON DELETE SET NULL,
     "provider" text NOT NULL DEFAULT 'mercadopago',
     "provider_preference_id" text,
     "provider_payment_id" text,
     "external_reference" text NOT NULL,
     "amount" numeric(12,2) NOT NULL,
     "currency" text NOT NULL DEFAULT 'PEN',
     "status" text NOT NULL DEFAULT 'pending',
     "status_detail" text,
     "payment_method" text,
     "description" text,
     "metadata" jsonb,
     "paid_at" timestamp,
     "created_at" timestamp DEFAULT now(),
     "updated_at" timestamp DEFAULT now()
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "payments_external_reference_uq" ON "payments" ("external_reference")`,
  `CREATE INDEX IF NOT EXISTS "payments_preference_idx" ON "payments" ("provider_preference_id")`,
  `CREATE INDEX IF NOT EXISTS "payments_payment_idx" ON "payments" ("provider_payment_id")`,

  // --- payment_webhook_events ----------------------------------------------
  `CREATE TABLE IF NOT EXISTS "payment_webhook_events" (
     "id" serial PRIMARY KEY,
     "provider" text NOT NULL DEFAULT 'mercadopago',
     "event_id" text,
     "event_type" text,
     "topic" text,
     "payload" jsonb NOT NULL,
     "signature_valid" boolean DEFAULT false,
     "processed" boolean NOT NULL DEFAULT false,
     "processed_at" timestamp,
     "error" text,
     "received_at" timestamp DEFAULT now()
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "payment_webhook_events_provider_event_uq"
     ON "payment_webhook_events" ("provider", "event_id")`,

  // --- subscriptions --------------------------------------------------------
  `CREATE TABLE IF NOT EXISTS "subscriptions" (
     "id" serial PRIMARY KEY,
     "business_id" integer NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
     "user_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
     "plan" text NOT NULL DEFAULT 'free',
     "provider" text NOT NULL DEFAULT 'mercadopago',
     "provider_preapproval_id" text,
     "status" text NOT NULL DEFAULT 'inactive',
     "amount" numeric(12,2),
     "currency" text NOT NULL DEFAULT 'PEN',
     "current_period_end" timestamp,
     "created_at" timestamp DEFAULT now(),
     "updated_at" timestamp DEFAULT now()
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_business_uq" ON "subscriptions" ("business_id")`,
];

async function main() {
  console.log("[ensure-schema] Applying additive auth/payments schema...");
  for (const statement of statements) {
    try {
      await sql.unsafe(statement);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Ignore "already exists" races; surface anything else.
      if (!/already exists|duplicate/i.test(message)) {
        console.error("[ensure-schema] Failed:", statement.slice(0, 80), "\n  ", message);
        throw error;
      }
    }
  }
  console.log("[ensure-schema] Done. All auth/payments tables are present.");
}

main()
  .then(() => sql.end())
  .catch(async (error) => {
    console.error("[ensure-schema] Aborted:", error);
    await sql.end();
    process.exit(1);
  });

export { statements };
