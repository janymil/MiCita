-- Enhancement migration for apify_businesses table
-- Adds new fields for improved data quality and expanded collection

-- Add new columns for enhanced data
ALTER TABLE apify_businesses 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS services TEXT[],
ADD COLUMN IF NOT EXISTS social_media JSONB,
ADD COLUMN IF NOT EXISTS image_urls TEXT[],
ADD COLUMN IF NOT EXISTS verified_status VARCHAR(20) DEFAULT 'unverified',
ADD COLUMN IF NOT EXISTS data_freshness_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS phone_formatted VARCHAR(20),
ADD COLUMN IF NOT EXISTS phone_country_code VARCHAR(5) DEFAULT '+51',
ADD COLUMN IF NOT EXISTS coordinates_validated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS business_status VARCHAR(20) DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS amenities JSONB,
ADD COLUMN IF NOT EXISTS price_range_text VARCHAR(50),
ADD COLUMN IF NOT EXISTS last_scraped TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS scraping_source VARCHAR(50) DEFAULT 'apify',
ADD COLUMN IF NOT EXISTS quality_score INTEGER DEFAULT 0;

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_apify_businesses_verified_status ON apify_businesses(verified_status);
CREATE INDEX IF NOT EXISTS idx_apify_businesses_business_status ON apify_businesses(business_status);
CREATE INDEX IF NOT EXISTS idx_apify_businesses_quality_score ON apify_businesses(quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_apify_businesses_last_scraped ON apify_businesses(last_scraped DESC);
CREATE INDEX IF NOT EXISTS idx_apify_businesses_phone_formatted ON apify_businesses(phone_formatted);
CREATE INDEX IF NOT EXISTS idx_apify_businesses_social_media ON apify_businesses USING gin(social_media);
CREATE INDEX IF NOT EXISTS idx_apify_businesses_amenities ON apify_businesses USING gin(amenities);

-- Update existing records with default values
UPDATE apify_businesses 
SET 
  verified_status = 'scraped',
  business_status = 'operational',
  last_scraped = created_at,
  scraping_source = 'apify'
WHERE verified_status = 'unverified';

-- Add constraints
ALTER TABLE apify_businesses 
ADD CONSTRAINT chk_verified_status CHECK (verified_status IN ('unverified', 'scraped', 'verified', 'claimed')),
ADD CONSTRAINT chk_business_status CHECK (business_status IN ('unknown', 'operational', 'temporarily_closed', 'permanently_closed')),
ADD CONSTRAINT chk_quality_score CHECK (quality_score >= 0 AND quality_score <= 100),
ADD CONSTRAINT chk_data_freshness_score CHECK (data_freshness_score >= 0 AND data_freshness_score <= 100);

-- Create function to calculate quality score
CREATE OR REPLACE FUNCTION calculate_quality_score(
  p_name TEXT,
  p_phone TEXT,
  p_website TEXT,
  p_photo_url TEXT,
  p_rating DECIMAL,
  p_review_count INTEGER,
  p_hours JSONB,
  p_description TEXT,
  p_coordinates_validated BOOLEAN
) RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
BEGIN
  -- Base score for having a name
  IF p_name IS NOT NULL AND LENGTH(p_name) > 2 THEN
    score := score + 10;
  END IF;
  
  -- Phone number
  IF p_phone IS NOT NULL AND LENGTH(p_phone) > 8 THEN
    score := score + 15;
  END IF;
  
  -- Website
  IF p_website IS NOT NULL AND p_website LIKE 'http%' THEN
    score := score + 15;
  END IF;
  
  -- Photo
  IF p_photo_url IS NOT NULL AND p_photo_url LIKE 'http%' THEN
    score := score + 10;
  END IF;
  
  -- Rating and reviews
  IF p_rating > 0 THEN
    score := score + 10;
  END IF;
  
  IF p_review_count > 0 THEN
    score := score + 10;
  END IF;
  
  -- Hours
  IF p_hours IS NOT NULL THEN
    score := score + 10;
  END IF;
  
  -- Description
  IF p_description IS NOT NULL AND LENGTH(p_description) > 20 THEN
    score := score + 10;
  END IF;
  
  -- Validated coordinates
  IF p_coordinates_validated = TRUE THEN
    score := score + 10;
  END IF;
  
  RETURN score;
END;
$$ LANGUAGE plpgsql;

-- Update quality scores for existing records
UPDATE apify_businesses 
SET quality_score = calculate_quality_score(
  name, phone, website, photo_url, rating, review_count, 
  hours, description, coordinates_validated
);

-- Create trigger to automatically update quality score
CREATE OR REPLACE FUNCTION update_quality_score_trigger() RETURNS TRIGGER AS $$
BEGIN
  NEW.quality_score := calculate_quality_score(
    NEW.name, NEW.phone, NEW.website, NEW.photo_url, NEW.rating, NEW.review_count,
    NEW.hours, NEW.description, NEW.coordinates_validated
  );
  NEW.last_updated := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_quality_score
  BEFORE INSERT OR UPDATE ON apify_businesses
  FOR EACH ROW
  EXECUTE FUNCTION update_quality_score_trigger();

-- Verify the enhancements
SELECT 
  COUNT(*) as total_records,
  AVG(quality_score) as avg_quality_score,
  COUNT(CASE WHEN phone_formatted IS NOT NULL THEN 1 END) as with_formatted_phone,
  COUNT(CASE WHEN coordinates_validated = TRUE THEN 1 END) as with_validated_coords
FROM apify_businesses;