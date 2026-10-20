-- WhatsApp appointment lifecycle (reminders + booking confirmations).
ALTER TABLE "appointments"
	ADD COLUMN IF NOT EXISTS "whatsapp_reminder_sent_at" timestamp;
ALTER TABLE "appointments"
	ADD COLUMN IF NOT EXISTS "whatsapp_confirmation_sent_at" timestamp;
