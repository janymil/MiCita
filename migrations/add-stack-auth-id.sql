-- Add stack_auth_id column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS stack_auth_id TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_stack_auth_id ON users(stack_auth_id);
