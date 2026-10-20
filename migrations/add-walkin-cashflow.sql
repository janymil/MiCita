-- Phase 1: Chair Mode ("Sentar cliente ahora") + daily cash drawer (Yape/Plin/efectivo).
-- Safe to re-run: every statement is idempotent.

ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "source" text NOT NULL DEFAULT 'booking';
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "started_at" timestamp;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "completed_at" timestamp;
CREATE INDEX IF NOT EXISTS "appointments_source_idx" ON "appointments" USING btree ("business_id", "source");

CREATE TABLE IF NOT EXISTS "service_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"appointment_id" integer,
	"client_id" integer,
	"service_id" integer,
	"service_name" text,
	"amount" numeric(10, 2) NOT NULL,
	"tip_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"method" text DEFAULT 'cash' NOT NULL,
	"note" text,
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now()
);

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'service_transactions_business_id_businesses_id_fk'
	) THEN
		ALTER TABLE "service_transactions"
			ADD CONSTRAINT "service_transactions_business_id_businesses_id_fk"
			FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE;
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'service_transactions_appointment_id_appointments_id_fk'
	) THEN
		ALTER TABLE "service_transactions"
			ADD CONSTRAINT "service_transactions_appointment_id_appointments_id_fk"
			FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL;
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'service_transactions_client_id_clients_id_fk'
	) THEN
		ALTER TABLE "service_transactions"
			ADD CONSTRAINT "service_transactions_client_id_clients_id_fk"
			FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL;
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'service_transactions_service_id_services_id_fk'
	) THEN
		ALTER TABLE "service_transactions"
			ADD CONSTRAINT "service_transactions_service_id_services_id_fk"
			FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL;
	END IF;
END $$;

CREATE INDEX IF NOT EXISTS "service_transactions_business_date_idx"
	ON "service_transactions" USING btree ("business_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "service_transactions_appointment_idx"
	ON "service_transactions" USING btree ("appointment_id");
