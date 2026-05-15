const db = require('../../../config/db');

const ALLOWED_CATEGORIES = [
  'Electrical',
  'Plumbing',
  'Cleaning',
  'Furniture',
  'Other',
];

/**
 * POST /api/issues — community members only (enforced by route middleware).
 * Body: { title?, description, category, building, floor?, room?, image_url? }
 *
 * image_url: optional string — prefer a public HTTPS URL from Supabase Storage / S3 / Cloudinary.
 * The client may send a data URL for local demos; replace with cloud upload + URL for production.
 */
async function createIssue(req, res) {
  try {
    const userId = req.user.id;
    console.log('[createIssue] POST user_id=%s role=%s', userId, req.user.role);
    const { title, description, category, building, floor, room, image_url } = req.body;

    const errors = [];
    if (!description || !String(description).trim()) {
      errors.push('Description is required.');
    }
    if (!category || !ALLOWED_CATEGORIES.includes(category)) {
      errors.push('Category is required and must be one of the allowed values.');
    }
    if (!building || !String(building).trim()) {
      errors.push('Building / location is required.');
    }

    let imageUrlVal = null;
    if (image_url != null && String(image_url).trim()) {
      imageUrlVal = String(image_url).trim();
      // Prevent accidental huge payloads (adjust when using proper multipart upload).
      if (imageUrlVal.length > 4_000_000) {
        errors.push('Image data is too large. Upload to cloud storage and send a short URL instead.');
      }
    }

    if (errors.length) {
      return res.status(400).json({
        message: errors.join(' '),
        errors,
      });
    }

    const titleVal =
      title != null && String(title).trim() ? String(title).trim().slice(0, 255) : null;
    const floorVal =
      floor != null && String(floor).trim() ? String(floor).trim().slice(0, 100) : null;
    const roomVal =
      room != null && String(room).trim() ? String(room).trim().slice(0, 100) : null;

    const result = await db.query(
      `INSERT INTO issues (
          user_id, title, description, category, building, floor, room, image_url, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Pending')
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
          updated_at`,
      [
        userId,
        titleVal,
        String(description).trim(),
        category,
        String(building).trim(),
        floorVal,
        roomVal,
        imageUrlVal,
      ],
    );

    const issue = result.rows[0];
    console.log('[createIssue] created issue id=%s user_id=%s', issue.id, issue.user_id);

    return res.status(201).json({
      success: true,
      issue,
      data: formatIssueRow(issue),
    });
  } catch (err) {
    if (err.code === '42P01') {
      return res.status(503).json({
        message:
          'Issues table is missing. Run backend/sql/issues_schema.sql on your database, then retry.',
      });
    }
    console.error('createIssue error:', err.message, err.code, err.detail || '');
    return res.status(500).json({ message: 'Server error while creating issue.' });
  }
}

function formatIssueRow(row) {
  const parts = [row.building, row.floor, row.room].filter(Boolean);
  return {
    id: row.id,
    title: row.title || `${row.category || 'Campus'} Issue`,
    description: row.description,
    category: row.category,
    location: parts.length ? parts.join(', ') : null,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    photoUrl: row.image_url || null,
  };
}

module.exports = {
  createIssue,
};
