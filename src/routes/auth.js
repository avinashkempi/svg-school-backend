const express = require('express');
const { loginValidation } = require('../validations/auth');
const { login } = require('../controllers/authController');

const router = express.Router();

router.post('/login', loginValidation, login);

module.exports = router;
