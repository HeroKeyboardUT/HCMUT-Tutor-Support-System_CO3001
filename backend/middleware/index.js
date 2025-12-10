const {
  authenticate,
  optionalAuth,
  authorize,
  checkPermission,
  rateLimit,
} = require("./auth");
const {
  handleValidationErrors,
  validationRules,
  validateRegistration,
  validateLogin,
} = require("./validate");

module.exports = {
  // Auth middleware
  authenticate,
  optionalAuth,
  authorize,
  checkPermission,
  rateLimit,

  // Validation middleware
  handleValidationErrors,
  validationRules,
  validateRegistration,
  validateLogin,
};
