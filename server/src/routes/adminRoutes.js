const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const adminController = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');

// Validation rules
const policyValidation = [
  body('policyName').notEmpty().withMessage('Policy name is required'),
  body('leaveType').isIn(['casual', 'sick', 'earned', 'unpaid', 'maternity', 'paternity', 'bereavement', 'marriage'])
    .withMessage('Invalid leave type'),
  body('totalDaysPerYear').isFloat({ min: 0 }).withMessage('Total days must be a positive number'),
  body('maxConsecutiveDays').optional().isFloat({ min: 1 }),
  body('minDaysBeforeApply').optional().isFloat({ min: 0 }),
  body('requiresApproval').optional().isBoolean(),
  body('carryForward').optional().isBoolean(),
  body('maxCarryForwardDays').optional().isFloat({ min: 0 })
];

const holidayValidation = [
  body('name').notEmpty().withMessage('Holiday name is required'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('type').isIn(['national', 'regional', 'festival', 'company', 'other']).withMessage('Invalid holiday type'),
  body('description').optional().isString().isLength({ max: 500 }),
  body('isOptional').optional().isBoolean()
];

const bulkHolidayValidation = [
  body('holidays').isArray().withMessage('Holidays must be an array'),
  body('holidays.*.name').notEmpty().withMessage('Each holiday must have a name'),
  body('holidays.*.date').isISO8601().withMessage('Each holiday must have a valid date')
];

const resetBalanceValidation = [
  body('year').isInt({ min: 2000, max: 2100 }).withMessage('Valid year is required'),
  body('carryForwardPercentage').optional().isInt({ min: 0, max: 100 }).withMessage('Carry forward percentage must be between 0 and 100')
];

// Leave Policy routes
router.post('/policies', protect, isAdmin, policyValidation, adminController.createPolicy);
router.get('/policies', protect, isAdmin, adminController.getAllPolicies);
router.get('/policies/:id', protect, isAdmin, param('id').isMongoId(), adminController.getPolicyById);
router.put('/policies/:id', protect, isAdmin, param('id').isMongoId(), policyValidation, adminController.updatePolicy);
router.delete('/policies/:id', protect, isAdmin, param('id').isMongoId(), adminController.deletePolicy);
router.post('/policies/init', protect, isAdmin, adminController.initDefaultPolicies);

// Holiday routes
router.post('/holidays', protect, isAdmin, holidayValidation, adminController.addHoliday);
router.post('/holidays/bulk', protect, isAdmin, bulkHolidayValidation, adminController.bulkAddHolidays);
router.get('/holidays', protect, isAdmin, adminController.getAllHolidays);
router.put('/holidays/:id', protect, isAdmin, param('id').isMongoId(), holidayValidation, adminController.updateHoliday);
router.delete('/holidays/:id', protect, isAdmin, param('id').isMongoId(), adminController.deleteHoliday);

// System Management routes
router.get('/dashboard-stats', protect, isAdmin, adminController.getDashboardStats);
router.post('/reset-leave-balance', protect, isAdmin, resetBalanceValidation, adminController.resetYearlyLeaveBalance);

module.exports = router;