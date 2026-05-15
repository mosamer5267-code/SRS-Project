/**
 * PostgreSQL connection pool (Supabase or any Postgres URL via DATABASE_URL).
 * Supabase: use the "connection string" from Project Settings → Database.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Supabase often requires SSL in production
  ssl:
    process.env.PGSSLMODE === 'require' || process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
