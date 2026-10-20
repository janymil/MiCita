-- Prepaid service packages ("bonos").
CREATE TABLE IF NOT EXISTS "service_packages" (
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
);
CREATE INDEX IF NOT EXISTS "service_packages_business_idx"
  ON "service_packages" ("business_id", "status");

CREATE TABLE IF NOT EXISTS "package_purchases" (
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
);
CREATE UNIQUE INDEX IF NOT EXISTS "package_purchases_token_uq"
  ON "package_purchases" ("token");
CREATE INDEX IF NOT EXISTS "package_purchases_business_idx"
  ON "package_purchases" ("business_id", "status");
CREATE INDEX IF NOT EXISTS "package_purchases_client_idx"
  ON "package_purchases" ("client_id", "status");

CREATE TABLE IF NOT EXISTS "package_redemptions" (
  "id" serial PRIMARY KEY NOT NULL,
  "purchase_id" integer NOT NULL REFERENCES "package_purchases"("id") ON DELETE CASCADE,
  "business_id" integer NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
  "appointment_id" integer REFERENCES "appointments"("id") ON DELETE SET NULL,
  "uses_used" integer NOT NULL DEFAULT 1,
  "note" text,
  "created_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "package_redemptions_purchase_idx"
  ON "package_redemptions" ("purchase_id", "created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "package_redemptions_appointment_uq"
  ON "package_redemptions" ("appointment_id");
