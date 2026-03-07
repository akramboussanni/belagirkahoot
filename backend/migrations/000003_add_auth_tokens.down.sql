ALTER TABLE hosts 
DROP COLUMN IF EXISTS is_verified,
DROP COLUMN IF EXISTS verification_token,
DROP COLUMN IF EXISTS reset_token,
DROP COLUMN IF EXISTS reset_token_expires_at;
