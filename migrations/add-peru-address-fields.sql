-- Add Peru-specific address fields to businesses table
ALTER TABLE businesses 
ADD COLUMN district TEXT,
ADD COLUMN referencia TEXT;

-- Update existing records to extract district from address where possible
UPDATE businesses 
SET district = 'Lima' 
WHERE city = 'Lima' AND district IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN businesses.district IS 'Peru district (distrito) - important for Peru address format';
COMMENT ON COLUMN businesses.referencia IS 'Peru address reference/landmark - helps with location identification';
