-- Cancellation waitlist: matching customers are notified when a slot frees.
CREATE TABLE IF NOT EXISTS "waitlist_entries" (
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
);

CREATE UNIQUE INDEX IF NOT EXISTS "waitlist_entries_token_uq"
  ON "waitlist_entries" ("token");
CREATE INDEX IF NOT EXISTS "waitlist_entries_business_date_idx"
  ON "waitlist_entries" ("business_id", "date", "status");
CREATE INDEX IF NOT EXISTS "waitlist_entries_service_idx"
  ON "waitlist_entries" ("service_id", "date", "status");
