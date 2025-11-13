const { body } = require('express-validator');

const loginValidation = [
  body('phone')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please provide a valid 10-digit Indian phone number (starting with 6-9)'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

module.exports = {
  loginValidation
};
