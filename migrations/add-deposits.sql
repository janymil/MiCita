-- No-show protection: optional booking deposit credited to the visit.
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "deposit_amount" numeric(10, 2);
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "deposit_status" text;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "deposit_paid_at" timestamp;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "deposit_expires_at" timestamp;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "deposit_payment_id" text;

CREATE INDEX IF NOT EXISTS "appointments_deposit_idx"
  ON "appointments" ("deposit_status", "deposit_expires_at");

-- Post-service review requests.
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "review_request_sent_at" timestamp;
