const { validationResult } = require('express-validator');
const { apiResponse } = require('../utils/helpers');

/**
 * Middleware to handle validation errors from express-validator
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err) => err.msg);
    return apiResponse(res, 400, errorMessages.join(', '));
  }
  next();
}

module.exports = { validate };
