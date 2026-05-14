const express = require('express');
const { authenticate, requireRole } = require('../../middleware/authMiddleware');
const { createIssue } = require('./create/handler');

const router = express.Router();

router.post('/', authenticate, requireRole('community_member'), createIssue);

module.exports = router;
