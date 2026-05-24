const { body, validationResult } = require('express-validator');
const { HTTP_STATUS, USER_GENDER } = require('../config/constants');

// Validation rules
exports.registerValidator = [
  body('employeeId')
    .notEmpty().withMessage('Employee ID is required')
    .isLength({ min: 3, max: 20 }).withMessage('Employee ID must be between 3 and 20 characters'),
  body('name')
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/).withMessage('Password must contain at least one letter and one number'),
  body('gender')
    .notEmpty().withMessage('Gender is required')
    .isIn(Object.values(USER_GENDER)).withMessage(`Gender must be one of: ${Object.values(USER_GENDER).join(', ')}`),
  body('department')
    .notEmpty().withMessage('Department is required'),
  body('designation')
    .notEmpty().withMessage('Designation is required'),
  body('dateOfBirth')
    .notEmpty().withMessage('Date of birth is required')
    .isISO8601().withMessage('Date of birth must be a valid date')
    .custom((value) => {
      const date = new Date(value);
      const today = new Date();
      const age = today.getFullYear() - date.getFullYear();
      const monthDiff = today.getMonth() - date.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
        age--;
      }
      if (age < 18) {
        throw new Error('Employee must be at least 18 years old');
      }
      if (age > 70) {
        throw new Error('Employee age cannot exceed 70 years');
      }
      return true;
    }),
  body('contactNumber')
    .matches(/^[0-9]{10}$/).withMessage('Contact number must be 10 digits'),
  body('joiningDate')
    .optional()
    .isISO8601().withMessage('Joining date must be a valid date'),
  body('role')
    .optional()
    .isIn(['employee', 'manager', 'admin']).withMessage('Role must be employee, manager, or admin'),
  body('managerId')
    .optional()
    .isMongoId().withMessage('Invalid manager ID'),
  body('address')
    .optional()
    .isObject().withMessage('Address must be an object')
];

exports.loginValidator = [
  body('email')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
];

exports.changePasswordValidator = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/).withMessage('Password must contain at least one letter and one number'),
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage('Passwords do not match')
];

exports.forgotPasswordValidator = [
  body('email')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail()
];

exports.resetPasswordValidator = [
  body('newPassword')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/).withMessage('Password must contain at least one letter and one number'),
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage('Passwords do not match')
];

// Validation result handler
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  
  const extractedErrors = [];
  errors.array().map(err => extractedErrors.push({ [err.param]: err.msg }));
  
  return res.status(HTTP_STATUS.BAD_REQUEST).json({
    success: false,
    errors: extractedErrors
  });
};