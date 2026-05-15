const express = require('express');
const db = require('../config/db');
const { authenticate, requireRole } = require('../middleware/authMiddleware');
const { createIssue } = require('./issues/create/handler');

const router = express.Router();

function normalizeStatus(status) {
  return status || 'Pending';
}

function buildLocation(row) {
  if (row.location) return row.location;
  const parts = [row.building, row.floor, row.room].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

function formatIssue(row) {
  return {
    id: row.id ?? row.issue_id,
    title: row.title || `${row.category || 'Campus'} Issue`,
    description: row.description,
    category: row.category,
    location: buildLocation(row),
    status: normalizeStatus(row.status),
    reportedBy: row.user_id ?? row.reported_by,
    assignedWorkerId: row.assigned_worker_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at ?? null,
    photoUrl: row.image_url ?? row.photo_url ?? null,
  };
}

function isManagerRole(user) {
  return user.role === 'facility_manager' || user.role === 'admin';
}

function isMissingColumn(error, columnName) {
  return error?.code === '42703' && String(error.message || '').includes(columnName);
}

function missingAssignmentSupport(res) {
  return res.status(503).json({
    message:
      'Issue assignment is not available because the database does not include assigned_worker_id.',
  });
}

function missingCommentsSupport(res) {
  return res.status(503).json({
    message:
      'Work comments are not available because the database does not include a comments table.',
  });
}

function missingPhotoSupport(res) {
  return res.status(503).json({
    message:
      'Completion photos are not available because photo storage/type tables are not configured.',
  });
}

function cleanQueryValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeIssueStatus(status) {
  const cleaned = String(status || '').trim().toLowerCase();
  const allowed = {
    pending: 'Pending',
    'in progress': 'In Progress',
    in_progress: 'In Progress',
    resolved: 'Resolved',
  };

  return allowed[cleaned] || null;
}

async function getAssignedWorkerId(issueId) {
  const result = await db.query(
    'SELECT assigned_worker_id FROM issues WHERE id = $1',
    [issueId],
  );

  if (result.rows.length === 0) return null;
  return result.rows[0].assigned_worker_id;
}

async function ensureIssueAccess(req, res, issue) {
  if (isManagerRole(req.user)) return true;

  if (
    req.user.role === 'community_member' &&
    String(issue.user_id) === String(req.user.id)
  ) {
    return true;
  }

  if (req.user.role === 'worker') {
    try {
      const assignedWorkerId = await getAssignedWorkerId(issue.id);
      if (String(assignedWorkerId) === String(req.user.id)) {
        issue.assigned_worker_id = assignedWorkerId;
        return true;
      }
      return false;
    } catch (error) {
      if (isMissingColumn(error, 'assigned_worker_id')) {
        missingAssignmentSupport(res);
        return null;
      }
      throw error;
    }
  }

  return false;
}

function buildIssuesListQuery(query) {
  const params = [];
  const filters = [];

  const status = cleanQueryValue(query.status);
  const category = cleanQueryValue(query.category);
  const search = cleanQueryValue(query.search);

  if (status && status.toLowerCase() !== 'all') {
    params.push(status);
    filters.push(`LOWER(COALESCE(i.status, 'Pending')) = LOWER($${params.length})`);
  }

  if (category && category.toLowerCase() !== 'all') {
    params.push(category);
    filters.push(`LOWER(i.category) = LOWER($${params.length})`);
  }

  if (search) {
    params.push(`%${search}%`);
    filters.push(`(
      i.title ILIKE $${params.length}
      OR i.description ILIKE $${params.length}
      OR i.category ILIKE $${params.length}
      OR i.building ILIKE $${params.length}
      OR COALESCE(i.floor, '') ILIKE $${params.length}
      OR COALESCE(i.room, '') ILIKE $${params.length}
      OR CAST(i.id AS TEXT) ILIKE $${params.length}
    )`);
  }

  const sortableColumns = {
    status: "COALESCE(i.status, 'Pending')",
    date: 'i.created_at',
    category: 'i.category',
  };

  const sortBy = cleanQueryValue(query.sortBy).toLowerCase();
  const sortColumn = sortableColumns[sortBy] || sortableColumns.date;

  const requestedOrder = cleanQueryValue(query.sortOrder).toUpperCase();
  const sortOrder = requestedOrder === 'ASC' ? 'ASC' : 'DESC';

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  return {
    text: `
      SELECT
        i.id,
        i.user_id,
        i.title,
        i.description,
        i.category,
        i.building,
        i.floor,
        i.room,
        i.image_url,
        i.status,
        i.created_at,
        i.updated_at
      FROM issues i
      ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder}, i.id DESC
    `,
    values: params,
  };
}

async function getIssuePhotos(issueId) {
  try {
    const result = await db.query(
      `
      SELECT 
        photo_id AS id,
        photo_url AS url,
        photo_type AS type,
        uploaded_at AS "uploadedAt"
      FROM issue_photos
      WHERE issue_id = $1
      ORDER BY uploaded_at ASC
      `,
      [issueId]
    );

    return result.rows;
  } catch (error) {
    console.log('photos table not ready or no photos found:', error.message);
    return [];
  }
}

async function getIssueComments(issueId) {
  try {
    const result = await db.query(
      `
      SELECT
        comment_id AS id,
        worker_id AS "workerId",
        comment_text AS text,
        created_at AS "createdAt"
      FROM comments
      WHERE issue_id = $1
      ORDER BY created_at ASC
      `,
      [issueId]
    );

    return result.rows;
  } catch (error) {
    console.log('comments table not ready or no comments found:', error.message);
    return [];
  }
}

// POST /api/issues — community members submit issues
router.post('/', authenticate, requireRole('community_member'), createIssue);

// GET /api/issues
// Facility managers can view and filter all submitted issues.
router.get('/', authenticate, async (req, res) => {
  try {
    if (!isManagerRole(req.user)) {
      return res.status(403).json({
        message: 'Only facility managers can view all issues.',
      });
    }

    const listQuery = buildIssuesListQuery(req.query);
    const result = await db.query(listQuery.text, listQuery.values);

    return res.json({
      success: true,
      count: result.rows.length,
      data: result.rows.map(formatIssue),
      filters: {
        status: cleanQueryValue(req.query.status) || 'all',
        category: cleanQueryValue(req.query.category) || 'all',
        search: cleanQueryValue(req.query.search),
        sortBy: cleanQueryValue(req.query.sortBy) || 'date',
        sortOrder: cleanQueryValue(req.query.sortOrder).toUpperCase() === 'ASC'
          ? 'ASC'
          : 'DESC',
      },
    });
  } catch (error) {
    console.error('get issues error:', error);

    return res.status(500).json({
      message: 'Could not load issues.',
    });
  }
});

// GET /api/issues/my — register before GET /:id
// Community member can view only the issues they submitted.
router.get('/my', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'community_member') {
      return res.status(403).json({
        message: 'Only community members can view their submitted issues.',
      });
    }

    const result = await db.query(
      `
      SELECT
        i.id,
        i.user_id,
        i.title,
        i.description,
        i.category,
        i.building,
        i.floor,
        i.room,
        i.image_url,
        i.status,
        i.created_at,
        i.updated_at
      FROM issues i
      WHERE i.user_id = $1
      ORDER BY i.created_at DESC
      `,
      [req.user.id]
    );

    return res.json({
      success: true,
      count: result.rows.length,
      data: result.rows.map(formatIssue),
    });
  } catch (error) {
    console.error('get my issues error:', error.message, error.code, error.detail);

    return res.status(500).json({
      message: 'Could not load your issues.',
    });
  }
});

// GET /api/issues/assigned
// Workers can view only issues assigned to their account.
router.get('/assigned', authenticate, requireRole('worker'), async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT
        i.id,
        i.user_id,
        i.assigned_worker_id,
        i.title,
        i.description,
        i.category,
        i.building,
        i.floor,
        i.room,
        i.image_url,
        i.status,
        i.created_at,
        i.updated_at
      FROM issues i
      WHERE i.assigned_worker_id = $1
      ORDER BY i.created_at DESC
      `,
      [req.user.id],
    );

    return res.json({
      success: true,
      count: result.rows.length,
      data: result.rows.map(formatIssue),
    });
  } catch (error) {
    if (isMissingColumn(error, 'assigned_worker_id')) {
      return missingAssignmentSupport(res);
    }
    console.error('get assigned issues error:', error.message, error.code, error.detail);
    return res.status(500).json({ message: 'Could not load assigned issues.' });
  }
});

// GET /api/issues/:id
// Shows full details for one issue.
router.get('/:id', authenticate, async (req, res) => {
  try {
    const issueId = req.params.id;

    const result = await db.query(
      `
      SELECT
        id,
        user_id,
        title,
        description,
        category,
        building,
        floor,
        room,
        image_url,
        status,
        created_at,
        updated_at
      FROM issues
      WHERE id = $1
      `,
      [issueId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Issue not found.',
      });
    }

    const issue = result.rows[0];
    const allowed = await ensureIssueAccess(req, res, issue);
    if (allowed === null) return;
    if (!allowed) {
      return res.status(403).json({
        message: 'You are not allowed to view this issue.',
      });
    }

    const photos = await getIssuePhotos(issueId);
    const comments = await getIssueComments(issueId);

    return res.json({
      success: true,
      data: {
        ...formatIssue(issue),
        photos,
        comments,
      },
    });
  } catch (error) {
    console.error('get issue details error:', error.message, error.code, error.detail);

    return res.status(500).json({
      message: 'Could not load issue details.',
    });
  }
});

// PUT /api/issues/:id/status
// Managers can set any supported status; assigned workers can mark their work in progress.
router.put('/:id/status', authenticate, async (req, res) => {
  try {
    const issueId = req.params.id;
    const nextStatus = normalizeIssueStatus(req.body.status);

    if (!nextStatus) {
      return res.status(400).json({
        message: 'Status must be Pending, In Progress, or Resolved.',
      });
    }

    const issueResult = await db.query(
      'SELECT id, user_id, status FROM issues WHERE id = $1',
      [issueId],
    );

    if (issueResult.rows.length === 0) {
      return res.status(404).json({ message: 'Issue not found.' });
    }

    const issue = issueResult.rows[0];
    if (!isManagerRole(req.user)) {
      if (req.user.role !== 'worker' || nextStatus !== 'In Progress') {
        return res.status(403).json({ message: 'You are not allowed to update this status.' });
      }

      const allowed = await ensureIssueAccess(req, res, issue);
      if (allowed === null) return;
      if (!allowed) {
        return res.status(403).json({ message: 'You are not assigned to this issue.' });
      }
    }

    const updateResult = await db.query(
      `
      UPDATE issues
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING
        id,
        user_id,
        title,
        description,
        category,
        building,
        floor,
        room,
        image_url,
        status,
        created_at,
        updated_at
      `,
      [nextStatus, issueId],
    );

    return res.json({
      success: true,
      message: 'Issue status updated.',
      data: formatIssue(updateResult.rows[0]),
    });
  } catch (error) {
    console.error('update issue status error:', error.message, error.code, error.detail);
    return res.status(500).json({ message: 'Could not update issue status.' });
  }
});

// PUT /api/issues/:id/assign
router.put('/:id/assign', authenticate, requireRole('facility_manager', 'admin'), async (req, res) => {
  try {
    const issueId = req.params.id;
    const workerId = req.body.workerId ?? req.body.worker_id;

    if (!workerId || !String(workerId).trim()) {
      return res.status(400).json({ message: 'Worker id is required.' });
    }

    const workerResult = await db.query(
      'SELECT id, role FROM users WHERE id = $1',
      [workerId],
    );

    if (workerResult.rows.length === 0 || workerResult.rows[0].role !== 'worker') {
      return res.status(400).json({ message: 'Assigned user must exist with worker role.' });
    }

    const updateResult = await db.query(
      `
      UPDATE issues
      SET assigned_worker_id = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING
        id,
        user_id,
        assigned_worker_id,
        title,
        description,
        category,
        building,
        floor,
        room,
        image_url,
        status,
        created_at,
        updated_at
      `,
      [workerId, issueId],
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ message: 'Issue not found.' });
    }

    return res.json({
      success: true,
      message: 'Issue assigned.',
      data: formatIssue(updateResult.rows[0]),
    });
  } catch (error) {
    if (isMissingColumn(error, 'assigned_worker_id')) {
      return missingAssignmentSupport(res);
    }
    console.error('assign issue error:', error.message, error.code, error.detail);
    return res.status(500).json({ message: 'Could not assign issue.' });
  }
});

// PUT /api/issues/:id/close
router.put('/:id/close', authenticate, requireRole('facility_manager', 'admin'), async (req, res) => {
  try {
    const issueId = req.params.id;
    const issueResult = await db.query(
      'SELECT id, user_id, status FROM issues WHERE id = $1',
      [issueId],
    );

    if (issueResult.rows.length === 0) {
      return res.status(404).json({ message: 'Issue not found.' });
    }

    if (issueResult.rows[0].status !== 'Resolved') {
      return res.status(400).json({ message: 'Only resolved issues can be closed.' });
    }

    const updateResult = await db.query(
      `
      UPDATE issues
      SET status = 'Resolved', updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        user_id,
        title,
        description,
        category,
        building,
        floor,
        room,
        image_url,
        status,
        created_at,
        updated_at
      `,
      [issueId],
    );

    return res.json({
      success: true,
      message: 'Resolved issue closed.',
      data: formatIssue(updateResult.rows[0]),
    });
  } catch (error) {
    console.error('close issue error:', error.message, error.code, error.detail);
    return res.status(500).json({ message: 'Could not close issue.' });
  }
});

// POST /api/issues/:id/comments
router.post('/:id/comments', authenticate, requireRole('worker'), async (req, res) => {
  try {
    const issueId = req.params.id;
    const commentText = String(req.body.comment || req.body.text || '').trim();

    if (!commentText) {
      return res.status(400).json({ message: 'Comment text is required.' });
    }

    const issueResult = await db.query(
      'SELECT id, user_id FROM issues WHERE id = $1',
      [issueId],
    );

    if (issueResult.rows.length === 0) {
      return res.status(404).json({ message: 'Issue not found.' });
    }

    const allowed = await ensureIssueAccess(req, res, issueResult.rows[0]);
    if (allowed === null) return;
    if (!allowed) {
      return res.status(403).json({ message: 'You are not assigned to this issue.' });
    }

    const commentResult = await db.query(
      `
      INSERT INTO comments (issue_id, worker_id, comment_text)
      VALUES ($1, $2, $3)
      RETURNING
        comment_id AS id,
        worker_id AS "workerId",
        comment_text AS text,
        created_at AS "createdAt"
      `,
      [issueId, req.user.id, commentText],
    );

    return res.status(201).json({
      success: true,
      message: 'Comment added.',
      data: commentResult.rows[0],
    });
  } catch (error) {
    if (error?.code === '42P01') {
      return missingCommentsSupport(res);
    }
    if (isMissingColumn(error, 'assigned_worker_id')) {
      return missingAssignmentSupport(res);
    }
    console.error('add comment error:', error.message, error.code, error.detail);
    return res.status(500).json({ message: 'Could not add comment.' });
  }
});

// POST /api/issues/:id/photo
router.post('/:id/photo', authenticate, requireRole('worker'), async (req, res) => {
  return missingPhotoSupport(res);
});

// DELETE /api/issues/:id
router.delete('/:id', authenticate, requireRole('facility_manager', 'admin'), async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM issues WHERE id = $1 RETURNING id',
      [req.params.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Issue not found.' });
    }

    return res.json({ success: true, message: 'Issue deleted.' });
  } catch (error) {
    console.error('delete issue error:', error.message, error.code, error.detail);
    return res.status(500).json({ message: 'Could not delete issue.' });
  }
});

module.exports = router;
