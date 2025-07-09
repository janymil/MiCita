-- Add subcategory field to apify_businesses table
ALTER TABLE apify_businesses ADD COLUMN subcategory text;

-- Update existing records to have subcategory same as category for now
UPDATE apify_businesses SET subcategory = category WHERE subcategory IS NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_apify_businesses_subcategory ON apify_businesses(subcategory);
CREATE INDEX IF NOT EXISTS idx_apify_businesses_category_subcategory ON apify_businesses(category, subcategory);