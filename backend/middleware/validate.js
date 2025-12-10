const { body, param, query, validationResult } = require("express-validator");

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }

  next();
};

// Common validation rules
const validationRules = {
  // User validations
  email: body("email")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),

  password: body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),

  userId: body("userId")
    .trim()
    .notEmpty()
    .withMessage("User ID (MSSV/Mã cán bộ) is required"),

  firstName: body("firstName")
    .trim()
    .notEmpty()
    .withMessage("First name is required"),

  lastName: body("lastName")
    .trim()
    .notEmpty()
    .withMessage("Last name is required"),

  // Session validations
  sessionDate: body("scheduledDate")
    .isISO8601()
    .withMessage("Please provide a valid date"),

  // ID parameter validation
  mongoId: (field) => param(field).isMongoId().withMessage(`Invalid ${field}`),

  // Pagination
  pagination: [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
  ],
};

// Registration validation
const validateRegistration = [
  validationRules.email,
  validationRules.password,
  validationRules.userId,
  validationRules.firstName,
  validationRules.lastName,
  handleValidationErrors,
];

// Login validation
const validateLogin = [
  body("email")
    .optional()
    .isEmail()
    .withMessage("Please provide a valid email"),
  body("userId")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("User ID is required if email not provided"),
  validationRules.password,
  handleValidationErrors,
];

module.exports = {
  handleValidationErrors,
  validationRules,
  validateRegistration,
  validateLogin,
};
