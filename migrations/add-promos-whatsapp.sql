-- F2: dead-hour promotions + promo claims + central WhatsApp bot log.
-- Additive and idempotent.

CREATE TABLE IF NOT EXISTS "promos" (
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
	"capacity" integer DEFAULT 3 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"message" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "promos_code_uq" ON "promos" ("code");
CREATE INDEX IF NOT EXISTS "promos_business_date_idx" ON "promos" ("business_id", "date", "status");

CREATE TABLE IF NOT EXISTS "promo_claims" (
	"id" serial PRIMARY KEY NOT NULL,
	"promo_id" integer NOT NULL REFERENCES "promos"("id") ON DELETE CASCADE,
	"business_id" integer NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
	"appointment_id" integer REFERENCES "appointments"("id") ON DELETE SET NULL,
	"client_id" integer REFERENCES "clients"("id") ON DELETE SET NULL,
	"name" text NOT NULL,
	"phone" text,
	"date" text NOT NULL,
	"time" text NOT NULL,
	"status" text DEFAULT 'reserved' NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"cancelled_at" timestamp
);
CREATE UNIQUE INDEX IF NOT EXISTS "promo_claims_token_uq" ON "promo_claims" ("token");
CREATE INDEX IF NOT EXISTS "promo_claims_promo_status_idx" ON "promo_claims" ("promo_id", "status");
CREATE INDEX IF NOT EXISTS "promo_claims_slot_idx" ON "promo_claims" ("promo_id", "date", "time");
-- One active claim per slot; cancelled claims free the slot again.
CREATE UNIQUE INDEX IF NOT EXISTS "promo_claims_slot_uq"
	ON "promo_claims" ("promo_id", "date", "time")
	WHERE "status" <> 'cancelled';

CREATE TABLE IF NOT EXISTS "whatsapp_messages" (
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
);
CREATE INDEX IF NOT EXISTS "whatsapp_messages_phone_idx" ON "whatsapp_messages" ("phone", "created_at");
CREATE INDEX IF NOT EXISTS "whatsapp_messages_direction_idx" ON "whatsapp_messages" ("direction", "created_at");
