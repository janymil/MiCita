-- Create apifyBusinesses table for scraped business data
CREATE TABLE IF NOT EXISTS apify_businesses (
  id SERIAL PRIMARY KEY,
  place_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  category TEXT NOT NULL,
  rating DECIMAL(3, 2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  price_level INTEGER DEFAULT 0,
  phone TEXT,
  website TEXT,
  photo_url TEXT,
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  open_now BOOLEAN,
  hours JSONB,
  search_terms TEXT,
  is_registered BOOLEAN DEFAULT FALSE,
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_apify_businesses_place_id ON apify_businesses(place_id);
CREATE INDEX IF NOT EXISTS idx_apify_businesses_category ON apify_businesses(category);
CREATE INDEX IF NOT EXISTS idx_apify_businesses_search_terms ON apify_businesses USING gin(to_tsvector('english', search_terms));
CREATE INDEX IF NOT EXISTS idx_apify_businesses_location ON apify_businesses(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_apify_businesses_rating ON apify_businesses(rating DESC);

-- Add some example test data to verify the table works
INSERT INTO apify_businesses (
  place_id, name, address, category, rating, review_count, 
  latitude, longitude, search_terms
) VALUES 
  ('test_barberia_miraflores', 'Barbería Premium Miraflores', 'Av. Larco 123, Miraflores', 'belleza', 4.5, 89, -12.1191, -77.0351, 'barbería premium miraflores lima belleza'),
  ('test_restaurante_sanisidro', 'Restaurante Central San Isidro', 'Av. Conquistadores 456, San Isidro', 'gastronomia', 4.8, 234, -12.0969, -77.0378, 'restaurante central san isidro lima gastronomia'),
  ('test_clinica_lamolina', 'Clínica Maison de Santé', 'Av. El Corregidor 789, La Molina', 'salud', 4.2, 156, -12.0797, -76.9423, 'clínica maison santé la molina lima salud')
ON CONFLICT (place_id) DO NOTHING;

-- Verify the table was created successfully
SELECT COUNT(*) as total_businesses FROM apify_businesses;