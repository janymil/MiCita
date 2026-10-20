-- Phase 2: same-day virtual queue ("Saca tu turno").
-- Safe to re-run: additive + IF NOT EXISTS only.

CREATE TABLE IF NOT EXISTS "queue_tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"client_id" integer,
	"service_id" integer,
	"appointment_id" integer,
	"name" text NOT NULL,
	"phone" text,
	"status" text DEFAULT 'waiting' NOT NULL,
	"token" text NOT NULL,
	"notes" text,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"notified_at" timestamp,
	"seated_at" timestamp,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'queue_tickets_business_id_businesses_id_fk'
	) THEN
		ALTER TABLE "queue_tickets"
			ADD CONSTRAINT "queue_tickets_business_id_businesses_id_fk"
			FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE;
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'queue_tickets_client_id_clients_id_fk'
	) THEN
		ALTER TABLE "queue_tickets"
			ADD CONSTRAINT "queue_tickets_client_id_clients_id_fk"
			FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL;
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'queue_tickets_service_id_services_id_fk'
	) THEN
		ALTER TABLE "queue_tickets"
			ADD CONSTRAINT "queue_tickets_service_id_services_id_fk"
			FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL;
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'queue_tickets_appointment_id_appointments_id_fk'
	) THEN
		ALTER TABLE "queue_tickets"
			ADD CONSTRAINT "queue_tickets_appointment_id_appointments_id_fk"
			FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL;
	END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "queue_tickets_token_uq" ON "queue_tickets" USING btree ("token");
CREATE INDEX IF NOT EXISTS "queue_tickets_business_status_idx"
	ON "queue_tickets" USING btree ("business_id", "status", "joined_at");
