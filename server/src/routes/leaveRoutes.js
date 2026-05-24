const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const leaveController = require('../controllers/leaveController');
const { protect } = require('../middleware/authMiddleware');
const { isAdminOrManager, canManageLeave, isSelfOrAuthorized } = require('../middleware/roleMiddleware');

// Validation rules
const applyLeaveValidation = [
  body('leaveType').isIn(['casual', 'sick', 'earned', 'unpaid', 'maternity', 'paternity', 'bereavement', 'marriage'])
    .withMessage('Invalid leave type'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required'),
  body('reason').notEmpty().withMessage('Reason is required').isLength({ min: 5, max: 500 })
    .withMessage('Reason must be between 5 and 500 characters'),
  body('isHalfDay').optional().isBoolean(),
  body('halfDaySession').optional().isIn(['first_half', 'second_half']),
  body('contactDuringLeave').optional().isString(),
  body('emergencyContact').optional().isString()
];

const updateLeaveValidation = [
  body('startDate').optional().isISO8601().withMessage('Valid start date is required'),
  body('endDate').optional().isISO8601().withMessage('Valid end date is required'),
  body('reason').optional().isLength({ min: 5, max: 500 }).withMessage('Reason must be between 5 and 500 characters'),
  body('contactDuringLeave').optional().isString(),
  body('emergencyContact').optional().isString()
];

const reviewLeaveValidation = [
  body('comments').optional().isString().isLength({ max: 500 }).withMessage('Comments cannot exceed 500 characters')
];

const getLeavesValidation = [
  query('status').optional().isIn(['pending', 'approved', 'rejected', 'cancelled']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
];

// Employee routes
router.post('/apply', protect, applyLeaveValidation, leaveController.applyLeave);
router.get('/my-leaves', protect, getLeavesValidation, leaveController.getMyLeaves);
router.get('/balance', protect, leaveController.getLeaveBalance);
router.get('/:id', protect, param('id').isMongoId(), leaveController.getLeaveById);
router.put('/:id', protect, param('id').isMongoId(), updateLeaveValidation, leaveController.updateLeave);
router.delete('/:id/cancel', protect, param('id').isMongoId(), leaveController.cancelLeave);

// Manager routes
router.get('/pending/team', protect, isAdminOrManager, leaveController.getTeamPendingLeaves);
router.get('/team-summary', protect, isAdminOrManager, leaveController.getTeamLeaveSummary);
router.put('/:id/approve', protect, canManageLeave, reviewLeaveValidation, leaveController.approveLeave);
router.put('/:id/reject', protect, canManageLeave, reviewLeaveValidation, leaveController.rejectLeave);

module.exports = router;