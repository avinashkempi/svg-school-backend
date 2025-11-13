const { body } = require('express-validator');

const createNewsValidation = [
  body('title')
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters'),
  body('description')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Description must be between 1 and 1000 characters'),
  body('creationDate')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date in ISO format'),
  body('url')
    .optional()
    .isURL()
    .withMessage('URL must be a valid URL'),
  body('privateNews')
    .optional()
    .isBoolean()
    .withMessage('privateNews must be a boolean value')
];

const updateNewsValidation = [
  body('title')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters'),
  body('description')
    .optional()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Description must be between 1 and 1000 characters'),
  body('creationDate')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date in ISO format'),
  body('url')
    .optional()
    .isURL()
    .withMessage('URL must be a valid URL'),
  body('privateNews')
    .optional()
    .isBoolean()
    .withMessage('privateNews must be a boolean value')
];

module.exports = {
  createNewsValidation,
  updateNewsValidation
};
