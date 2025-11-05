const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { userValidation } = require('../validations/user');
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
} = require('../controllers/userController');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all users (admin only)
router.get('/', requireAdmin, getAllUsers);

// Get user by ID
router.get('/:id', getUserById);

// Create new user (admin only)
router.post('/', requireAdmin, userValidation, createUser);

// Update user (admin only)
router.put('/:id', requireAdmin, userValidation, updateUser);

// Delete user (admin only)
router.delete('/:id', requireAdmin, deleteUser);

module.exports = router;
