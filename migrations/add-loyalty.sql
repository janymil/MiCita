-- Loyalty stamps / repeat-visit rewards.
CREATE TABLE IF NOT EXISTS "loyalty_cards" (
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
);

CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_cards_token_uq"
  ON "loyalty_cards" ("token");
CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_cards_business_phone_uq"
  ON "loyalty_cards" ("business_id", "phone");
CREATE INDEX IF NOT EXISTS "loyalty_cards_business_idx"
  ON "loyalty_cards" ("business_id", "updated_at");

CREATE TABLE IF NOT EXISTS "loyalty_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "card_id" integer NOT NULL REFERENCES "loyalty_cards"("id") ON DELETE CASCADE,
  "business_id" integer NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
  "appointment_id" integer REFERENCES "appointments"("id") ON DELETE SET NULL,
  "type" text NOT NULL,
  "stamps_delta" integer NOT NULL DEFAULT 1,
  "note" text,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "loyalty_events_card_idx"
  ON "loyalty_events" ("card_id", "created_at");
CREATE INDEX IF NOT EXISTS "loyalty_events_appointment_idx"
  ON "loyalty_events" ("appointment_id");
