const express = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

function normalizeStatus(status) {
  return status || 'Pending';
}

function formatIssue(row) {
  return {
    id: row.issue_id,
    title: row.title || `${row.category || 'Campus'} Issue`,
    description: row.description,
    category: row.category,
    location: row.location,
    status: normalizeStatus(row.status),
    reportedBy: row.reported_by,
    assignedWorkerId: row.assigned_worker_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
    photoUrl: row.photo_url || null,
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

// GET /api/issues/my
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
        i.issue_id,
        i.reported_by,
        i.assigned_worker_id,
        i.title,
        i.description,
        i.category,
        i.location,
        i.status,
        i.created_at,
        i.updated_at,
        i.resolved_at,
        (
          SELECT p.photo_url
          FROM issue_photos p
          WHERE p.issue_id = i.issue_id
          ORDER BY p.uploaded_at ASC
          LIMIT 1
        ) AS photo_url
      FROM issues i
      WHERE i.reported_by = $1
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
    console.error('get my issues error:', error);

    return res.status(500).json({
      message: 'Could not load your issues.',
    });
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
        issue_id,
        reported_by,
        assigned_worker_id,
        title,
        description,
        category,
        location,
        status,
        created_at,
        updated_at,
        resolved_at
      FROM issues
      WHERE issue_id = $1
      `,
      [issueId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Issue not found.',
      });
    }

    const issue = result.rows[0];

    const isOwner =
      req.user.role === 'community_member' &&
      String(issue.reported_by) === String(req.user.id);

    const isAssignedWorker =
      req.user.role === 'worker' &&
      String(issue.assigned_worker_id) === String(req.user.id);

    const isManager =
      req.user.role === 'facility_manager' || req.user.role === 'admin';

    if (!isOwner && !isAssignedWorker && !isManager) {
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
    console.error('get issue details error:', error);

    return res.status(500).json({
      message: 'Could not load issue details.',
    });
  }
});

module.exports = router;