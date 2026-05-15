const express = require('express');
const db = require('../config/db');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

const STATUS_COLUMNS = ['is_active', 'active', 'status'];

async function getUserStatusColumn() {
  const result = await db.query(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'users'
      AND column_name = ANY($1)
    ORDER BY CASE column_name
      WHEN 'is_active' THEN 1
      WHEN 'active' THEN 2
      WHEN 'status' THEN 3
      ELSE 4
    END
    LIMIT 1
    `,
    [STATUS_COLUMNS],
  );

  return result.rows[0]?.column_name || null;
}

function formatStatus(value, statusColumn) {
  if (!statusColumn) return null;
  if (typeof value === 'boolean') return value ? 'active' : 'inactive';

  const cleanValue = String(value || '').trim().toLowerCase();
  if (!cleanValue) return null;
  if (['true', 'active', 'enabled', '1'].includes(cleanValue)) return 'active';
  if (['false', 'inactive', 'disabled', '0'].includes(cleanValue)) return 'inactive';

  return cleanValue;
}

function statusValueForColumn(statusColumn, active) {
  if (statusColumn === 'is_active' || statusColumn === 'active') {
    return active;
  }

  return active ? 'active' : 'inactive';
}

router.get('/users', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const statusColumn = await getUserStatusColumn();
    const statusSelect = statusColumn ? `, ${statusColumn} AS status_value` : '';

    const result = await db.query(
      `
      SELECT id, email, role${statusSelect}
      FROM users
      ORDER BY id ASC
      `,
    );

    return res.json({
      success: true,
      count: result.rows.length,
      statusSupported: Boolean(statusColumn),
      users: result.rows.map((row) => ({
        id: row.id,
        email: row.email,
        role: row.role,
        status: formatStatus(row.status_value, statusColumn),
      })),
    });
  } catch (error) {
    console.error('admin get users error:', error.message, error.code, error.detail);
    return res.status(500).json({ message: 'Could not load users.' });
  }
});

router.put('/users/:id/status', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const statusColumn = await getUserStatusColumn();
    if (!statusColumn) {
      return res.status(503).json({
        message: 'User activation status is not supported by the current users table.',
      });
    }

    const cleanStatus = String(req.body.status || '').trim().toLowerCase();
    if (!['active', 'inactive'].includes(cleanStatus)) {
      return res.status(400).json({ message: 'Status must be active or inactive.' });
    }

    const result = await db.query(
      `
      UPDATE users
      SET ${statusColumn} = $1
      WHERE id = $2
      RETURNING id, email, role, ${statusColumn} AS status_value
      `,
      [statusValueForColumn(statusColumn, cleanStatus === 'active'), req.params.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const row = result.rows[0];
    return res.json({
      success: true,
      message: 'User status updated.',
      user: {
        id: row.id,
        email: row.email,
        role: row.role,
        status: formatStatus(row.status_value, statusColumn),
      },
    });
  } catch (error) {
    console.error('admin update user status error:', error.message, error.code, error.detail);
    return res.status(500).json({ message: 'Could not update user status.' });
  }
});

module.exports = router;
