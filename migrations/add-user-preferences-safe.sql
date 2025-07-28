-- Migration: Add user preferences table for theme settings
-- This migration only adds new functionality without affecting existing data

CREATE TABLE IF NOT EXISTS "user_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"dashboard_theme" text DEFAULT 'clasico',
	"primary_color" text DEFAULT '#dc2626',
	"is_dark_mode" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

-- Add foreign key constraint
DO $$ BEGIN
 ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create unique index to ensure one preference record per user
CREATE UNIQUE INDEX IF NOT EXISTS "user_preferences_user_id_unique" ON "user_preferences" ("user_id");
