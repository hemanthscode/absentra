const express = require('express');
const router = express.Router();
const { param, query } = require('express-validator');
const reportController = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');
const { isAdmin, isAdminOrManager } = require('../middleware/roleMiddleware');

// Validation rules
const departmentReportValidation = [
  query('department').notEmpty().withMessage('Department is required'),
  query('startDate').isISO8601().withMessage('Valid start date is required'),
  query('endDate').isISO8601().withMessage('Valid end date is required'),
  query('format').optional().isIn(['json', 'csv', 'pdf']).withMessage('Format must be json, csv, or pdf')
];

const employeeReportValidation = [
  param('employeeId').isMongoId().withMessage('Invalid employee ID'),
  query('year').optional().isInt({ min: 2000, max: 2100 }).withMessage('Valid year is required')
];

const attendanceSummaryValidation = [
  query('month').optional().isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
  query('year').optional().isInt({ min: 2000, max: 2100 }).withMessage('Valid year is required')
];

const exportReportValidation = [
  query('type').isIn(['leaves', 'employees']).withMessage('Report type must be leaves or employees'),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('department').optional().isString()
];

// Report routes
router.get('/department', protect, isAdminOrManager, departmentReportValidation, reportController.getDepartmentReport);
router.get('/employee/:employeeId', protect, isAdminOrManager, employeeReportValidation, reportController.getEmployeeReport);
router.get('/attendance-summary', protect, isAdmin, attendanceSummaryValidation, reportController.getAttendanceSummary);
router.get('/export-csv', protect, isAdmin, exportReportValidation, reportController.exportReportCSV);

module.exports = router;