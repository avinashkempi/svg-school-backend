const express = require('express');
const { createNewsValidation, updateNewsValidation } = require('../validations/news');
const { createNews, getNews, getNewsById, updateNews, deleteNews } = require('../controllers/newsController');
const { authenticateToken, optionalAuthenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// POST /api/news - Create a new news item (admin only)
router.post('/', authenticateToken, requireAdmin, createNewsValidation, createNews);

// GET /api/news - Get all news items (public, but filtered by authentication)
router.get('/', optionalAuthenticateToken, getNews);

// GET /api/news/:id - Get a specific news item by ID (public)
router.get('/:id', getNewsById);

// PUT /api/news/:id - Update a specific news item by ID (admin only)
router.put('/:id', authenticateToken, requireAdmin, updateNewsValidation, updateNews);

// DELETE /api/news/:id - Delete a specific news item by ID (admin only)
router.delete('/:id', authenticateToken, requireAdmin, deleteNews);

module.exports = router;
