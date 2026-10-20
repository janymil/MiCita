-- Phase 3: owner-configurable desk settings (virtual queue + cash methods).
-- Additive only; the app normalizes missing/partial JSON with safe defaults.

ALTER TABLE "business_settings"
	ADD COLUMN IF NOT EXISTS "desk_settings" jsonb;
