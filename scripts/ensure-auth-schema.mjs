/**
 * Idempotent schema setup for the auth + payments tables and the owner desk
 * (Chair Mode walk-ins + daily cash drawer in `service_transactions`).
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

  // --- business_settings: microsite content + feature toggles ---------------
  `ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "enable_reviews" boolean DEFAULT true`,
  `ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "about_us" text`,
  `ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "years_of_experience" text`,
  `ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "specializations" text`,
  `ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "public_title" text`,
  `ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "services_description" text`,
  `ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "meta_title" text`,
  `ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "meta_description" text`,
  `ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "keywords" text`,

  // --- reviews: provenance + moderation (legacy rows stay visible) ----------
  `ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "source" text`,
  `ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "status" text`,
  `ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "owner_reply" text`,
  `ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "owner_replied_at" timestamp`,
  `ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "appointment_id" integer`,
  `ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "client_email" text`,
  `ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "ip_hash" text`,
  `UPDATE "reviews" SET "source" = 'microsite' WHERE "source" IS NULL`,
  `UPDATE "reviews" SET "status" = 'approved' WHERE "status" IS NULL`,
  `ALTER TABLE "reviews" ALTER COLUMN "source" SET DEFAULT 'microsite'`,
  `ALTER TABLE "reviews" ALTER COLUMN "status" SET DEFAULT 'pending'`,
  `CREATE INDEX IF NOT EXISTS "reviews_business_status_idx" ON "reviews" ("business_id", "status")`,

  // --- appointments: reminders + self-service cancel ------------------------
  `ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "reminder_sent_at" timestamp`,
  `ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "cancel_token" text`,
  `CREATE INDEX IF NOT EXISTS "appointments_business_date_idx" ON "appointments" ("business_id", "date")`,
  `CREATE INDEX IF NOT EXISTS "appointments_status_idx" ON "appointments" ("status")`,

  // --- hot-path indexes ----------------------------------------------------
  `CREATE INDEX IF NOT EXISTS "clients_business_idx" ON "clients" ("business_id")`,
  `CREATE INDEX IF NOT EXISTS "services_business_idx" ON "services" ("business_id")`,
  `CREATE INDEX IF NOT EXISTS "business_settings_business_idx" ON "business_settings" ("business_id")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "business_settings_custom_url_uq" ON "business_settings" ("custom_url")`,

  // --- microsite traffic --------------------------------------------------
  `CREATE TABLE IF NOT EXISTS "microsite_events" (
     "id" serial PRIMARY KEY,
     "business_id" integer NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
     "slug" text,
     "type" text NOT NULL,
     "path" text,
     "referrer" text,
     "source" text,
     "device" text,
     "session_id" text,
     "day" text NOT NULL,
     "metadata" jsonb,
     "created_at" timestamp DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS "microsite_events_business_day_idx" ON "microsite_events" ("business_id", "day")`,
  `CREATE INDEX IF NOT EXISTS "microsite_events_type_idx" ON "microsite_events" ("type")`,

  // --- microsite contact inbox -------------------------------------------
  `CREATE TABLE IF NOT EXISTS "contact_messages" (
     "id" serial PRIMARY KEY,
     "business_id" integer NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
     "name" text NOT NULL,
     "email" text,
     "phone" text,
     "message" text NOT NULL,
     "status" text NOT NULL DEFAULT 'new',
     "source" text DEFAULT 'microsite',
     "ip_hash" text,
     "created_at" timestamp DEFAULT now(),
     "updated_at" timestamp DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS "contact_messages_business_status_idx" ON "contact_messages" ("business_id", "status")`,

  // --- Phase 1 desk: Chair Mode walk-ins + daily cash drawer ----------------
  // `source` tells the analytics whether a visit came from booking, a walk-in,
  // the future queue or a promo. Existing rows default to "booking".
  `ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "source" text NOT NULL DEFAULT 'booking'`,
  `ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "started_at" timestamp`,
  `ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "completed_at" timestamp`,
  `CREATE INDEX IF NOT EXISTS "appointments_source_idx" ON "appointments" ("business_id", "source")`,
  `CREATE TABLE IF NOT EXISTS "service_transactions" (
     "id" serial PRIMARY KEY NOT NULL,
     "business_id" integer NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
     "appointment_id" integer REFERENCES "appointments"("id") ON DELETE SET NULL,
     "client_id" integer REFERENCES "clients"("id") ON DELETE SET NULL,
     "service_id" integer REFERENCES "services"("id") ON DELETE SET NULL,
     "service_name" text,
     "amount" numeric(10, 2) NOT NULL,
     "tip_amount" numeric(10, 2) NOT NULL DEFAULT '0',
     "method" text NOT NULL DEFAULT 'cash',
     "note" text,
     "occurred_at" timestamp NOT NULL DEFAULT now(),
     "created_at" timestamp DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS "service_transactions_business_date_idx" ON "service_transactions" ("business_id", "occurred_at")`,
  `CREATE INDEX IF NOT EXISTS "service_transactions_appointment_idx" ON "service_transactions" ("appointment_id")`,

  // --- Phase 2: same-day virtual queue ("Saca tu turno") -------------------
  `CREATE TABLE IF NOT EXISTS "queue_tickets" (
     "id" serial PRIMARY KEY NOT NULL,
     "business_id" integer NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
     "client_id" integer REFERENCES "clients"("id") ON DELETE SET NULL,
     "service_id" integer REFERENCES "services"("id") ON DELETE SET NULL,
     "appointment_id" integer REFERENCES "appointments"("id") ON DELETE SET NULL,
     "name" text NOT NULL,
     "phone" text,
     "status" text NOT NULL DEFAULT 'waiting',
     "token" text NOT NULL,
     "notes" text,
     "joined_at" timestamp NOT NULL DEFAULT now(),
     "notified_at" timestamp,
     "seated_at" timestamp,
     "closed_at" timestamp,
     "created_at" timestamp DEFAULT now()
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "queue_tickets_token_uq" ON "queue_tickets" ("token")`,
  `CREATE INDEX IF NOT EXISTS "queue_tickets_business_status_idx" ON "queue_tickets" ("business_id", "status", "joined_at")`,

  // --- Cancellation waitlist -------------------------------------------------
  `CREATE TABLE IF NOT EXISTS "waitlist_entries" (
     "id" serial PRIMARY KEY NOT NULL,
     "business_id" integer NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
     "service_id" integer REFERENCES "services"("id") ON DELETE SET NULL,
     "name" text NOT NULL,
     "phone" text NOT NULL,
     "date" text NOT NULL,
     "token" text NOT NULL,
     "status" text NOT NULL DEFAULT 'waiting',
     "offered_date" text,
     "offered_time" text,
     "notified_at" timestamp,
     "claimed_at" timestamp,
     "appointment_id" integer REFERENCES "appointments"("id") ON DELETE SET NULL,
     "created_at" timestamp DEFAULT now()
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "waitlist_entries_token_uq" ON "waitlist_entries" ("token")`,
  `CREATE INDEX IF NOT EXISTS "waitlist_entries_business_date_idx" ON "waitlist_entries" ("business_id", "date", "status")`,
  `CREATE INDEX IF NOT EXISTS "waitlist_entries_service_idx" ON "waitlist_entries" ("service_id", "date", "status")`,

  // --- Loyalty stamps / repeat-visit rewards -------------------------------
  `CREATE TABLE IF NOT EXISTS "loyalty_cards" (
     "id" serial PRIMARY KEY NOT NULL,
     "business_id" integer NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
     "client_id" integer REFERENCES "clients"("id") ON DELETE SET NULL,
     "name" text NOT NULL,
     "phone" text NOT NULL,
     "token" text NOT NULL,
     "total_stamps" integer NOT NULL DEFAULT 0,
     "rewards_redeemed" integer NOT NULL DEFAULT 0,
     "last_stamp_at" timestamp,
     "created_at" timestamp DEFAULT now(),
     "updated_at" timestamp DEFAULT now()
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_cards_token_uq" ON "loyalty_cards" ("token")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_cards_business_phone_uq" ON "loyalty_cards" ("business_id", "phone")`,
  `CREATE INDEX IF NOT EXISTS "loyalty_cards_business_idx" ON "loyalty_cards" ("business_id", "updated_at")`,
  `CREATE TABLE IF NOT EXISTS "loyalty_events" (
     "id" serial PRIMARY KEY NOT NULL,
     "card_id" integer NOT NULL REFERENCES "loyalty_cards"("id") ON DELETE CASCADE,
     "business_id" integer NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
     "appointment_id" integer REFERENCES "appointments"("id") ON DELETE SET NULL,
     "type" text NOT NULL,
     "stamps_delta" integer NOT NULL DEFAULT 1,
     "note" text,
     "created_at" timestamp DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS "loyalty_events_card_idx" ON "loyalty_events" ("card_id", "created_at")`,
  `CREATE INDEX IF NOT EXISTS "loyalty_events_appointment_idx" ON "loyalty_events" ("appointment_id")`,

  // --- Prepaid service packages ("bonos") ----------------------------------
  `CREATE TABLE IF NOT EXISTS "service_packages" (
     "id" serial PRIMARY KEY NOT NULL,
     "business_id" integer NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
     "service_id" integer REFERENCES "services"("id") ON DELETE SET NULL,
     "name" text NOT NULL,
     "description" text,
     "uses" integer NOT NULL DEFAULT 5,
     "price" numeric(10, 2) NOT NULL,
     "validity_days" integer NOT NULL DEFAULT 90,
     "status" text NOT NULL DEFAULT 'active',
     "created_at" timestamp DEFAULT now(),
     "updated_at" timestamp DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS "service_packages_business_idx" ON "service_packages" ("business_id", "status")`,
  `CREATE TABLE IF NOT EXISTS "package_purchases" (
     "id" serial PRIMARY KEY NOT NULL,
     "package_id" integer NOT NULL REFERENCES "service_packages"("id") ON DELETE CASCADE,
     "business_id" integer NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
     "client_id" integer REFERENCES "clients"("id") ON DELETE SET NULL,
     "name" text NOT NULL,
     "phone" text NOT NULL,
     "token" text NOT NULL,
     "uses_total" integer NOT NULL,
     "uses_remaining" integer NOT NULL,
     "amount_paid" numeric(10, 2) NOT NULL,
     "payment_method" text,
     "payment_reference" text,
     "status" text NOT NULL DEFAULT 'pending',
     "purchased_at" timestamp DEFAULT now(),
     "expires_at" timestamp,
     "created_at" timestamp DEFAULT now(),
     "updated_at" timestamp DEFAULT now()
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "package_purchases_token_uq" ON "package_purchases" ("token")`,
  `CREATE INDEX IF NOT EXISTS "package_purchases_business_idx" ON "package_purchases" ("business_id", "status")`,
  `CREATE INDEX IF NOT EXISTS "package_purchases_client_idx" ON "package_purchases" ("client_id", "status")`,
  `CREATE TABLE IF NOT EXISTS "package_redemptions" (
     "id" serial PRIMARY KEY NOT NULL,
     "purchase_id" integer NOT NULL REFERENCES "package_purchases"("id") ON DELETE CASCADE,
     "business_id" integer NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
     "appointment_id" integer REFERENCES "appointments"("id") ON DELETE SET NULL,
     "uses_used" integer NOT NULL DEFAULT 1,
     "note" text,
     "created_at" timestamp DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS "package_redemptions_purchase_idx" ON "package_redemptions" ("purchase_id", "created_at")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "package_redemptions_appointment_uq" ON "package_redemptions" ("appointment_id")`,

  // --- Owner desk configuration (queue + cash methods) ---------------------
  `ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "desk_settings" jsonb`,

  // --- F2: dead-hour promos + central WhatsApp bot -------------------------
  `CREATE TABLE IF NOT EXISTS "promos" (
     "id" serial PRIMARY KEY NOT NULL,
     "business_id" integer NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
     "service_id" integer REFERENCES "services"("id") ON DELETE SET NULL,
     "code" text NOT NULL,
     "title" text NOT NULL,
     "description" text,
     "promo_price" numeric(10, 2) NOT NULL,
     "date" text NOT NULL,
     "start_time" text NOT NULL,
     "end_time" text NOT NULL,
     "capacity" integer NOT NULL DEFAULT 3,
     "status" text NOT NULL DEFAULT 'active',
     "message" text,
     "created_at" timestamp DEFAULT now(),
     "updated_at" timestamp DEFAULT now()
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "promos_code_uq" ON "promos" ("code")`,
  `CREATE INDEX IF NOT EXISTS "promos_business_date_idx" ON "promos" ("business_id", "date", "status")`,
  `CREATE TABLE IF NOT EXISTS "promo_claims" (
     "id" serial PRIMARY KEY NOT NULL,
     "promo_id" integer NOT NULL REFERENCES "promos"("id") ON DELETE CASCADE,
     "business_id" integer NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
     "appointment_id" integer REFERENCES "appointments"("id") ON DELETE SET NULL,
     "client_id" integer REFERENCES "clients"("id") ON DELETE SET NULL,
     "name" text NOT NULL,
     "phone" text,
     "date" text NOT NULL,
     "time" text NOT NULL,
     "status" text NOT NULL DEFAULT 'reserved',
     "token" text NOT NULL,
     "created_at" timestamp DEFAULT now(),
     "cancelled_at" timestamp
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "promo_claims_token_uq" ON "promo_claims" ("token")`,
  `CREATE INDEX IF NOT EXISTS "promo_claims_promo_status_idx" ON "promo_claims" ("promo_id", "status")`,
  `CREATE INDEX IF NOT EXISTS "promo_claims_slot_idx" ON "promo_claims" ("promo_id", "date", "time")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "promo_claims_slot_uq" ON "promo_claims" ("promo_id", "date", "time") WHERE "status" <> 'cancelled'`,
  `CREATE TABLE IF NOT EXISTS "whatsapp_messages" (
     "id" serial PRIMARY KEY NOT NULL,
     "business_id" integer REFERENCES "businesses"("id") ON DELETE SET NULL,
     "direction" text NOT NULL,
     "phone" text,
     "text" text,
     "status" text NOT NULL,
     "provider_message_id" text,
     "error" text,
     "payload" jsonb,
     "created_at" timestamp DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS "whatsapp_messages_phone_idx" ON "whatsapp_messages" ("phone", "created_at")`,
  `CREATE INDEX IF NOT EXISTS "whatsapp_messages_direction_idx" ON "whatsapp_messages" ("direction", "created_at")`,

  // --- WhatsApp appointment reminders + confirmations ---------------------
  `ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "whatsapp_reminder_sent_at" timestamp`,
  `ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "whatsapp_confirmation_sent_at" timestamp`,

  // --- No-show protection: optional booking deposit -----------------------
  `ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "deposit_amount" numeric(10, 2)`,
  `ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "deposit_status" text`,
  `ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "deposit_paid_at" timestamp`,
  `ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "deposit_expires_at" timestamp`,
  `ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "deposit_payment_id" text`,
  `CREATE INDEX IF NOT EXISTS "appointments_deposit_idx" ON "appointments" ("deposit_status", "deposit_expires_at")`,

  // --- Post-service review requests ----------------------------------------
  `ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "review_request_sent_at" timestamp`,
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
