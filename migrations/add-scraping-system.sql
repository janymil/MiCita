-- Migration: Add scraping system tables
-- Created: July 29, 2025

-- Scraping jobs table
CREATE TABLE IF NOT EXISTS scraping_jobs (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  sources JSONB NOT NULL,
  raw_data JSONB,
  processed_data JSONB,
  quality_score INTEGER,
  progress INTEGER DEFAULT 0,
  current_step VARCHAR(255),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_business_id ON scraping_jobs(business_id);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_status ON scraping_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_created_at ON scraping_jobs(created_at);

-- Add scraping fields to business_settings table
ALTER TABLE business_settings 
ADD COLUMN IF NOT EXISTS scraped_data JSONB,
ADD COLUMN IF NOT EXISTS last_scraped_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS scraping_quality_score INTEGER;

-- Create indexes for new business_settings columns
CREATE INDEX IF NOT EXISTS idx_business_settings_last_scraped_at ON business_settings(last_scraped_at);
CREATE INDEX IF NOT EXISTS idx_business_settings_quality_score ON business_settings(scraping_quality_score);

-- Comments for documentation
COMMENT ON TABLE scraping_jobs IS 'Stores automated scraping job information and results';
COMMENT ON COLUMN scraping_jobs.sources IS 'JSON object containing URLs and search queries for scraping sources';
COMMENT ON COLUMN scraping_jobs.raw_data IS 'Raw data extracted from all sources before processing';
COMMENT ON COLUMN scraping_jobs.processed_data IS 'Cleaned and merged data ready for micrositio population';
COMMENT ON COLUMN scraping_jobs.quality_score IS 'Overall quality score of scraped data (0-100)';
COMMENT ON COLUMN business_settings.scraped_data IS 'Latest processed scraping data applied to this business';
COMMENT ON COLUMN business_settings.last_scraped_at IS 'Timestamp of last successful scraping operation';
COMMENT ON COLUMN business_settings.scraping_quality_score IS 'Quality score of last scraping operation';
