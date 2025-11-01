const express = require('express');
const { createEventValidation, updateEventValidation } = require('../validations/events');
const { createEvent, getEventById, updateEvent, deleteEvent,getEvent } = require('../controllers/eventController');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

// POST /api/events - Add a new event and create a notification immediately
router.post('/', authenticateToken, createEventValidation, createEvent);

// GET /api/events/:id - Get a specific event by ID
router.get('/:id', authenticateToken, getEventById);

// Get all the events
router.get('/', authenticateToken, getEvent);

// PUT /api/events/:id - Update a specific event by ID
router.put('/:id', authenticateToken, updateEventValidation, updateEvent);

// DELETE /api/events/:id - Delete an event and its associated notifications
router.delete('/:id', authenticateToken, deleteEvent);

module.exports = router;
