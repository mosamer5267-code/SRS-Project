/**
 * CampusCare API — Express entry point (auth module).
 *
 * Required env: DATABASE_URL, JWT_SECRET
 * Optional: PORT (default 3000), NODE_ENV, JWT_EXPIRES_IN, PGSSLMODE
 *
 * Database: create table (run once in Supabase SQL editor or psql):
 * CREATE TABLE IF NOT EXISTS users (
 *   id SERIAL PRIMARY KEY,
 *   email VARCHAR(255) UNIQUE NOT NULL,
 *   password_hash VARCHAR(255) NOT NULL,
 *   role VARCHAR(50) NOT NULL CHECK (role IN (
 *     'community_member', 'facility_manager', 'worker', 'admin'
 *   )),
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const issueRoutes = require('./routes/issueRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/api/issues', issueRoutes);

app.use('/api/auth', authRoutes);

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'campuscare-api' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`CampusCare API listening on port ${PORT}`);
});

const updateRoutes = require("./routes/update");
app.use("/api/issues", updateRoutes);
const workerRoutes = require('./routes/worker');
app.use('/api/worker', workerRoutes);
