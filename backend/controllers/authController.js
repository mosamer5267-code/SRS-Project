const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const SALT_ROUNDS = 10;
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '7d';

const ALLOWED_ROLES = [
  'community_member',
  'facility_manager',
  'worker',
  'admin',
];

function normalizeRole(role) {
  if (role == null || String(role).trim() === '') return null;

  const cleaned = String(role).trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (ALLOWED_ROLES.includes(cleaned)) return cleaned;

  const compact = cleaned.replace(/_/g, '');
  const aliases = {
    community: 'community_member',
    communitymember: 'community_member',
    facilitymanager: 'facility_manager',
    manager: 'facility_manager',
    worker: 'worker',
    admin: 'admin',
  };

  return aliases[compact] || null;
}

function toAuthUser(row) {
  const role = normalizeRole(row.role);
  if (!role) {
    const err = new Error(`Invalid role stored for user: ${row.role}`);
    err.code = 'INVALID_ROLE';
    throw err;
  }
  return { id: row.id, email: row.email, role };
}

function signToken(user) {
  if (!process.env.JWT_SECRET) {
    const err = new Error('JWT_SECRET is not configured.');
    err.code = 'JWT_SECRET_MISSING';
    throw err;
  }
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES },
  );
}

/**
 * POST /api/auth/register
 * Body: { email, password, role? } — role defaults to community_member
 */
async function register(req, res) {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const passwordStr = String(password);

    if (!normalizedEmail) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }
    if (passwordStr.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    const requestedRole =
      role != null && String(role).trim() ? String(role).trim() : 'community_member';
    const userRole = normalizeRole(requestedRole);
    if (!userRole) {
      return res.status(400).json({ message: 'Invalid role.' });
    }

    const passwordHash = await bcrypt.hash(passwordStr, SALT_ROUNDS);

    const result = await db.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id, email, role`,
      [normalizedEmail, passwordHash, userRole],
    );

    const user = toAuthUser(result.rows[0]);
    const token = signToken(user);

    return res.status(201).json({
      token,
      user,
    });
  } catch (err) {
    if (err.code === 'INVALID_ROLE') {
      return res.status(500).json({ message: 'Account has an invalid role. Contact support.' });
    }
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Email already registered.' });
    }
    if (err.code === 'JWT_SECRET_MISSING') {
      return res.status(500).json({ message: 'Server misconfiguration. Contact support.' });
    }
    console.error('register error:', err);
    return res.status(500).json({ message: 'Server error during registration.' });
  }
}

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const passwordStr = String(password);

    if (!normalizedEmail) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const result = await db.query(
      `SELECT id, email, password_hash, role FROM users WHERE email = $1`,
      [normalizedEmail],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const row = result.rows[0];
    if (!row.password_hash) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const ok = await bcrypt.compare(passwordStr, row.password_hash);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const user = toAuthUser(row);
    const token = signToken(user);

    return res.json({ token, user });
  } catch (err) {
    if (err.code === 'INVALID_ROLE') {
      return res.status(500).json({ message: 'Account has an invalid role. Contact support.' });
    }
    if (err.code === 'JWT_SECRET_MISSING') {
      return res.status(500).json({ message: 'Server misconfiguration. Contact support.' });
    }
    console.error('login error:', err);
    return res.status(500).json({ message: 'Server error during login.' });
  }
}

/**
 * POST /api/auth/logout
 * JWT is stateless; client removes the token. This endpoint confirms session end.
 */
async function logout(req, res) {
  return res.json({ message: 'Logged out successfully.' });
}

module.exports = {
  register,
  login,
  logout,
};
