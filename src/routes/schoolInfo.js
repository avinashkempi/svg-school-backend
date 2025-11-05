const express = require('express');
const { getSchoolInfo, createOrUpdateSchoolInfo } = require('../controllers/schoolInfoController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/school-info - Get school information (public)
router.get('/', getSchoolInfo);

// POST /api/school-info - Create or update school info (admin only)
router.post('/', authenticateToken, requireAdmin, createOrUpdateSchoolInfo);

module.exports = router;
