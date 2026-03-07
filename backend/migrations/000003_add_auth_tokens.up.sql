ALTER TABLE hosts 
ADD COLUMN is_verified BOOLEAN DEFAULT false,
ADD COLUMN verification_token TEXT,
ADD COLUMN reset_token TEXT,
ADD COLUMN reset_token_expires_at TIMESTAMP WITH TIME ZONE;
