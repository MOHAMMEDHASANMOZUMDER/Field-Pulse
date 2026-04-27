-- FieldPulse Database Schema (PostgreSQL / Neon)
-- v2: Real-world authentication with email verification & Google OAuth

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  username TEXT UNIQUE,
  password TEXT,
  name TEXT,
  role TEXT DEFAULT 'technician',
  auth_provider TEXT DEFAULT 'local',
  google_id TEXT UNIQUE,
  avatar_url TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  password_reset_token TEXT,
  password_reset_expires BIGINT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS email_verifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  customer_name TEXT,
  phone TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  gps_accuracy DOUBLE PRECISION,
  service_type TEXT,
  status TEXT DEFAULT 'completed',
  notes TEXT,
  version INTEGER DEFAULT 1,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  submission_id TEXT REFERENCES submissions(id),
  data_url TEXT,
  file_path TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS signatures (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  submission_id TEXT REFERENCES submissions(id),
  data_url TEXT,
  file_path TEXT,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS routes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  status TEXT DEFAULT 'completed',
  start_time BIGINT,
  end_time BIGINT,
  point_count INTEGER DEFAULT 0,
  distance DOUBLE PRECISION DEFAULT 0,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS route_points (
  id TEXT PRIMARY KEY,
  route_id TEXT NOT NULL REFERENCES routes(id),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  "timestamp" BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  operation_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  status TEXT DEFAULT 'received',
  created_at BIGINT NOT NULL
);

-- Add new columns to existing users table if they don't exist
DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'local';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token TEXT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires BIGINT;
  -- Make password and username nullable (Google OAuth users don't have passwords, email users don't need usernames)
  ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
  ALTER TABLE users ALTER COLUMN username DROP NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_photos_submission ON photos(submission_id);
CREATE INDEX IF NOT EXISTS idx_signatures_submission ON signatures(submission_id);
CREATE INDEX IF NOT EXISTS idx_routes_user ON routes(user_id);
CREATE INDEX IF NOT EXISTS idx_route_points_route ON route_points(route_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_user ON sync_log(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications(token);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
