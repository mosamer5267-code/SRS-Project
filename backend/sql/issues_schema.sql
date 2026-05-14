-- Run in Supabase SQL editor or psql after `users` exists.
-- Member 2 — issues submitted by community members.

CREATE TABLE IF NOT EXISTS issues (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title VARCHAR(255),
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (
    category IN ('Electrical', 'Plumbing', 'Cleaning', 'Furniture', 'Other')
  ),
  building VARCHAR(255) NOT NULL,
  floor VARCHAR(100),
  room VARCHAR(100),
  -- Stores HTTPS URL from cloud storage when wired up, or a data URL for demos.
  image_url TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (
    status IN ('Pending', 'In Progress', 'Resolved')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_issues_user_id ON issues (user_id);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues (status);
