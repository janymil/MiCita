-- Migration: Add Apify-compatible columns to openstreet_businesses table
-- This allows OpenStreet businesses to have the same editing capabilities as Apify businesses

-- Add rating and review system
ALTER TABLE openstreet_businesses 
ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_level INTEGER DEFAULT 0;

-- Add business hours and status
ALTER TABLE openstreet_businesses 
ADD COLUMN IF NOT EXISTS open_now BOOLEAN,
ADD COLUMN IF NOT EXISTS hours JSONB,
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP DEFAULT NOW();

-- Add enhanced data fields
ALTER TABLE openstreet_businesses 
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS street_view_url TEXT,
ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS popular_times JSONB,
ADD COLUMN IF NOT EXISTS current_popularity INTEGER,
ADD COLUMN IF NOT EXISTS live_popularity_status TEXT;

-- Add business information
ALTER TABLE openstreet_businesses 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS services TEXT[],
ADD COLUMN IF NOT EXISTS social_media JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS image_urls TEXT[],
ADD COLUMN IF NOT EXISTS verified_status TEXT DEFAULT 'unverified',
ADD COLUMN IF NOT EXISTS data_freshness_score INTEGER DEFAULT 0;

-- Add phone formatting
ALTER TABLE openstreet_businesses 
ADD COLUMN IF NOT EXISTS phone_formatted TEXT,
ADD COLUMN IF NOT EXISTS phone_country_code TEXT DEFAULT '+51';

-- Add business validation
ALTER TABLE openstreet_businesses 
ADD COLUMN IF NOT EXISTS coordinates_validated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS business_status TEXT DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS price_range_text TEXT;

-- Add data tracking
ALTER TABLE openstreet_businesses 
ADD COLUMN IF NOT EXISTS last_scraped TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS scraping_source TEXT DEFAULT 'openstreetmap',
ADD COLUMN IF NOT EXISTS quality_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS original_scraped_data JSONB;

-- Add registration tracking
ALTER TABLE openstreet_businesses 
ADD COLUMN IF NOT EXISTS is_registered BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS search_terms TEXT;

-- Add badge system (same as Apify businesses)
ALTER TABLE openstreet_businesses 
ADD COLUMN IF NOT EXISTS public_badge TEXT DEFAULT 'unverified',
ADD COLUMN IF NOT EXISTS marketing_badge TEXT DEFAULT 'analyzing',
ADD COLUMN IF NOT EXISTS marketing_potential_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS marketing_opportunities JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS last_badge_analysis TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS is_claimed_google BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_website_analysis BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS digital_presence_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS marketing_notes TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_openstreet_businesses_rating ON openstreet_businesses(rating);
CREATE INDEX IF NOT EXISTS idx_openstreet_businesses_district ON openstreet_businesses(district);
CREATE INDEX IF NOT EXISTS idx_openstreet_businesses_category ON openstreet_businesses(category);
CREATE INDEX IF NOT EXISTS idx_openstreet_businesses_amenity ON openstreet_businesses(amenity);
CREATE INDEX IF NOT EXISTS idx_openstreet_businesses_marketing_badge ON openstreet_businesses(marketing_badge);
CREATE INDEX IF NOT EXISTS idx_openstreet_businesses_public_badge ON openstreet_businesses(public_badge);

-- Update search terms for existing records
UPDATE openstreet_businesses 
SET search_terms = LOWER(COALESCE(name, '') || ' ' || COALESCE(address, '') || ' ' || COALESCE(amenity, '') || ' ' || COALESCE(category, ''))
WHERE search_terms IS NULL;

-- Set default public badge to "OpenStreet" for identification
UPDATE openstreet_businesses 
SET public_badge = 'openstreet'
WHERE public_badge = 'unverified' OR public_badge IS NULL;

-- Update scraping source to identify data origin
UPDATE openstreet_businesses 
SET scraping_source = 'openstreetmap'
WHERE scraping_source IS NULL OR scraping_source = 'apify';

-- Set default quality score based on data completeness
UPDATE openstreet_businesses 
SET quality_score = (
  CASE WHEN name IS NOT NULL THEN 20 ELSE 0 END +
  CASE WHEN address IS NOT NULL THEN 15 ELSE 0 END +
  CASE WHEN phone IS NOT NULL THEN 15 ELSE 0 END +
  CASE WHEN website IS NOT NULL THEN 15 ELSE 0 END +
  CASE WHEN amenity IS NOT NULL THEN 10 ELSE 0 END +
  CASE WHEN category IS NOT NULL THEN 10 ELSE 0 END +
  CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 15 ELSE 0 END
)
WHERE quality_score = 0;