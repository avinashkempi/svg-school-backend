const express = require('express');
const { signupValidation, loginValidation } = require('../validations/auth');
const { signup, login } = require('../controllers/authController');

const router = express.Router();

router.post('/signup', signupValidation, signup);
router.post('/login', loginValidation, login);

module.exports = router;
