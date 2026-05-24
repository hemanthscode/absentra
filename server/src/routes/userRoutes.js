const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const userController = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { isAdmin, isAdminOrManager, isSelfOrAuthorized } = require('../middleware/roleMiddleware');

// Validation rules
const updateUserValidation = [
  body('name').optional().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('department').optional().notEmpty().withMessage('Department cannot be empty'),
  body('designation').optional().notEmpty().withMessage('Designation cannot be empty'),
  body('managerId').optional().isMongoId().withMessage('Invalid manager ID'),
  body('role').optional().isIn(['employee', 'manager', 'admin']).withMessage('Invalid role'),
  body('contactNumber').optional().isLength({ min: 10, max: 10 }).withMessage('Contact number must be 10 digits'),
  body('isActive').optional().isBoolean()
];

const updateLeaveBalanceValidation = [
  body('leaveType').isIn(['casual', 'sick', 'earned', 'unpaid', 'maternity', 'paternity', 'bereavement', 'marriage'])
    .withMessage('Invalid leave type'),
  body('days').isFloat({ min: 0 }).withMessage('Days must be a positive number'),
  body('action').isIn(['add', 'deduct', 'set']).withMessage('Action must be add, deduct, or set')
];

const getUsersValidation = [
  query('role').optional().isIn(['employee', 'manager', 'admin']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isString(),
  query('isActive').optional().isBoolean()
];

// Admin routes
router.get('/', protect, isAdmin, getUsersValidation, userController.getAllUsers);
router.get('/stats', protect, isAdmin, userController.getUserStats);
router.get('/search/:query', protect, isAdmin, userController.searchUsers);
router.get('/:id', protect, isAdmin, param('id').isMongoId(), userController.getUserById);
router.put('/:id', protect, isAdmin, param('id').isMongoId(), updateUserValidation, userController.updateUser);
router.delete('/:id', protect, isAdmin, param('id').isMongoId(), userController.deleteUser);
router.put('/:id/leave-balance', protect, isAdmin, param('id').isMongoId(), updateLeaveBalanceValidation, userController.updateLeaveBalance);

// Manager routes
router.get('/team/:managerId', protect, isAdminOrManager, param('managerId').isMongoId(), userController.getTeamMembers);

module.exports = router;