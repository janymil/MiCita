-- Add badge system columns to apify_businesses table

ALTER TABLE apify_businesses 
ADD COLUMN IF NOT EXISTS public_badge VARCHAR(50) DEFAULT 'unverified',
ADD COLUMN IF NOT EXISTS marketing_badge VARCHAR(50) DEFAULT 'analyzing',
ADD COLUMN IF NOT EXISTS marketing_potential_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS marketing_opportunities JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS last_badge_analysis TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_claimed_google BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_website_analysis BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS digital_presence_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS marketing_notes TEXT;

-- Create index for badge queries
CREATE INDEX IF NOT EXISTS idx_apify_businesses_public_badge ON apify_businesses(public_badge);
CREATE INDEX IF NOT EXISTS idx_apify_businesses_marketing_badge ON apify_businesses(marketing_badge);
CREATE INDEX IF NOT EXISTS idx_apify_businesses_marketing_potential ON apify_businesses(marketing_potential_score DESC);

-- Update existing businesses with initial badge analysis
UPDATE apify_businesses 
SET 
  public_badge = CASE 
    WHEN verified_status = 'claimed' THEN 'verified'
    WHEN verified_status = 'verified' THEN 'verified'
    WHEN rating::numeric >= 4.5 AND review_count >= 50 THEN 'trusted'
    ELSE 'unverified'
  END,
  is_claimed_google = CASE 
    WHEN verified_status IN ('claimed', 'verified') THEN true
    ELSE false
  END
WHERE public_badge = 'unverified'; -- Only update if not already processed

-- Add comments for documentation
COMMENT ON COLUMN apify_businesses.public_badge IS 'Public badge shown to users: verified, claimed, unverified, trusted, premium';
COMMENT ON COLUMN apify_businesses.marketing_badge IS 'Internal marketing opportunity: high_potential, email_ready, website_needed, digital_upgrade, claimed, no_opportunity';
COMMENT ON COLUMN apify_businesses.marketing_potential_score IS 'AI calculated score 0-100 for marketing potential';
COMMENT ON COLUMN apify_businesses.marketing_opportunities IS 'Array of marketing services: website, seo, social_media, photography, google_business';