-- FieldPulse Database Schema

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'technician',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  customer_name TEXT,
  phone TEXT,
  address TEXT,
  latitude REAL,
  longitude REAL,
  gps_accuracy REAL,
  service_type TEXT,
  status TEXT DEFAULT 'completed',
  notes TEXT,
  version INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  submission_id TEXT,
  data_url TEXT,
  file_path TEXT,
  latitude REAL,
  longitude REAL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (submission_id) REFERENCES submissions(id)
);

CREATE TABLE IF NOT EXISTS signatures (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  submission_id TEXT,
  data_url TEXT,
  file_path TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (submission_id) REFERENCES submissions(id)
);

CREATE TABLE IF NOT EXISTS routes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  status TEXT DEFAULT 'completed',
  start_time INTEGER,
  end_time INTEGER,
  point_count INTEGER DEFAULT 0,
  distance REAL DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS route_points (
  id TEXT PRIMARY KEY,
  route_id TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  accuracy REAL,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (route_id) REFERENCES routes(id)
);

CREATE TABLE IF NOT EXISTS sync_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  operation_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  status TEXT DEFAULT 'received',
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_photos_submission ON photos(submission_id);
CREATE INDEX IF NOT EXISTS idx_signatures_submission ON signatures(submission_id);
CREATE INDEX IF NOT EXISTS idx_routes_user ON routes(user_id);
CREATE INDEX IF NOT EXISTS idx_route_points_route ON route_points(route_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_user ON sync_log(user_id);
