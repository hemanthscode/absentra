const Leave = require('../models/Leave');
const User = require('../models/User');
const Holiday = require('../models/Holiday');
const LeavePolicy = require('../models/LeavePolicy');
const { LEAVE_STATUS, LEAVE_TYPES, HTTP_STATUS, MESSAGES } = require('../config/constants');
const { calculateWorkingDays, validateLeaveDates } = require('../utils/dateUtils');
const { checkLeaveBalance, updateLeaveBalance } = require('../utils/leaveValidation');

// @desc    Apply for leave
// @route   POST /api/leaves/apply
// @access  Private (Employee)
exports.applyLeave = async (req, res, next) => {
  try {
    const { 
      leaveType, startDate, endDate, reason, isHalfDay, 
      halfDaySession, contactDuringLeave, emergencyContact 
    } = req.body;
    
    const employeeId = req.user.id;
    
    // Get employee details
    const employee = await User.findById(employeeId);
    if (!employee) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.USER_NOT_FOUND
      });
    }
    
    // Check if leave type is allowed for employee's gender
    if (!employee.isLeaveTypeAllowed(leaveType)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.GENDER_RESTRICTION
      });
    }
    
    // Get leave policy
    const policy = await LeavePolicy.getPolicyByType(leaveType);
    if (!policy) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Leave policy not found for this type'
      });
    }
    
    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Set hours to 0 for accurate date comparison
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    
    console.log('Date Validation Debug:', {
      startDate: start,
      endDate: end,
      today: new Date(),
      minDaysBeforeApply: policy.minDaysBeforeApply
    });
    
    const dateValidation = validateLeaveDates(start, end, policy.minDaysBeforeApply);
    if (!dateValidation.isValid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: dateValidation.message
      });
    }
    
    // Check for overlapping leaves
    const overlappingLeaves = await Leave.findOverlappingLeaves(employeeId, start, end);
    if (overlappingLeaves.length > 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.DATE_CONFLICT
      });
    }
    
    // Calculate number of working days
    const numberOfDays = await calculateWorkingDays(start, end, isHalfDay);
    
    console.log('Leave Calculation Debug:', {
      numberOfDays,
      isHalfDay,
      leaveType,
      currentBalance: employee.leaveBalance[leaveType]
    });
    
    // Check leave balance
    const balanceCheck = await checkLeaveBalance(employee, leaveType, numberOfDays);
    if (!balanceCheck.hasBalance) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: balanceCheck.message
      });
    }
    
    // Create leave application
    const leave = await Leave.create({
      employeeId,
      managerId: employee.managerId,
      leaveType,
      startDate: start,
      endDate: end,
      numberOfDays,
      reason,
      isHalfDay: isHalfDay || false,
      halfDaySession: halfDaySession || null,
      contactDuringLeave,
      emergencyContact,
      appliedDate: new Date()
    });
    
    // Populate employee details for response
    await leave.populate('employeeId', 'name email employeeId designation gender');
    
    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: MESSAGES.LEAVE_APPLIED,
      data: leave
    });
  } catch (error) {
    console.error('Apply Leave Error:', error);
    next(error);
  }
};

// @desc    Get all leaves for logged in employee
// @route   GET /api/leaves/my-leaves
// @access  Private (Employee)
exports.getMyLeaves = async (req, res, next) => {
  try {
    const { status, startDate, endDate, page = 1, limit = 10 } = req.query;
    
    const query = { employeeId: req.user.id };
    
    if (status) query.status = status;
    if (startDate && endDate) {
      query.startDate = { $gte: new Date(startDate) };
      query.endDate = { $lte: new Date(endDate) };
    }
    
    const leaves = await Leave.find(query)
      .populate('reviewedBy', 'name')
      .sort({ appliedDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Leave.countDocuments(query);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: leaves,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single leave application
// @route   GET /api/leaves/:id
// @access  Private
exports.getLeaveById = async (req, res, next) => {
  try {
    const leave = await Leave.findById(req.params.id)
      .populate('employeeId', 'name email employeeId designation department')
      .populate('managerId', 'name email employeeId')
      .populate('reviewedBy', 'name email');
    
    if (!leave) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.LEAVE_NOT_FOUND
      });
    }
    
    // Check authorization (employee can view own leaves, manager can view team leaves)
    if (leave.employeeId._id.toString() !== req.user.id && 
        req.user.role !== 'admin' && 
        leave.managerId._id.toString() !== req.user.id) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: MESSAGES.FORBIDDEN
      });
    }
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: leave
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update leave application (only if pending)
// @route   PUT /api/leaves/:id
// @access  Private (Employee)
exports.updateLeave = async (req, res, next) => {
  try {
    const leave = await Leave.findById(req.params.id);
    
    if (!leave) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.LEAVE_NOT_FOUND
      });
    }
    
    // Check if user owns this leave
    if (leave.employeeId.toString() !== req.user.id) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: MESSAGES.FORBIDDEN
      });
    }
    
    // Check if leave can be edited
    if (!leave.canBeEdited()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Leave cannot be edited as it is already processed'
      });
    }
    
    const { startDate, endDate, reason, contactDuringLeave, emergencyContact } = req.body;
    
    if (startDate) leave.startDate = new Date(startDate);
    if (endDate) leave.endDate = new Date(endDate);
    if (reason) leave.reason = reason;
    if (contactDuringLeave) leave.contactDuringLeave = contactDuringLeave;
    if (emergencyContact) leave.emergencyContact = emergencyContact;
    
    // Recalculate days if dates changed
    if (startDate || endDate) {
      const numberOfDays = calculateWorkingDays(leave.startDate, leave.endDate, leave.isHalfDay);
      leave.numberOfDays = numberOfDays;
    }
    
    await leave.save();
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Leave updated successfully',
      data: leave
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel leave application
// @route   DELETE /api/leaves/:id/cancel
// @access  Private (Employee)
exports.cancelLeave = async (req, res, next) => {
  try {
    const leave = await Leave.findById(req.params.id);
    
    if (!leave) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.LEAVE_NOT_FOUND
      });
    }
    
    // Check if user owns this leave
    if (leave.employeeId.toString() !== req.user.id) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: MESSAGES.FORBIDDEN
      });
    }
    
    // Check if leave can be cancelled
    if (!leave.canBeCancelled()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Leave cannot be cancelled as it is already processed'
      });
    }
    
    leave.status = LEAVE_STATUS.CANCELLED;
    await leave.save();
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Leave cancelled successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get pending leaves for manager
// @route   GET /api/leaves/pending/team
// @access  Private (Manager)
exports.getTeamPendingLeaves = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    // Get all employees under this manager
    const teamMembers = await User.find({ 
      managerId: req.user.id,
      isActive: true 
    }).select('_id');
    
    const teamIds = teamMembers.map(member => member._id);
    
    const query = {
      employeeId: { $in: teamIds },
      status: LEAVE_STATUS.PENDING
    };
    
    const leaves = await Leave.find(query)
      .populate('employeeId', 'name email employeeId designation')
      .sort({ appliedDate: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Leave.countDocuments(query);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: leaves,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve leave application
// @route   PUT /api/leaves/:id/approve
// @access  Private (Manager)
exports.approveLeave = async (req, res, next) => {
  try {
    const { comments } = req.body;
    const leave = await Leave.findById(req.params.id)
      .populate('employeeId', 'name email leaveBalance');
    
    if (!leave) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.LEAVE_NOT_FOUND
      });
    }
    
    // Check if manager is authorized
    if (leave.managerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: MESSAGES.FORBIDDEN
      });
    }
    
    // Check if already processed
    if (leave.status !== LEAVE_STATUS.PENDING) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Leave already processed'
      });
    }
    
    // Update leave balance
    const updated = await updateLeaveBalance(leave.employeeId, leave.leaveType, leave.numberOfDays);
    if (!updated) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.INSUFFICIENT_BALANCE
      });
    }
    
    // Approve leave
    leave.status = LEAVE_STATUS.APPROVED;
    leave.reviewedBy = req.user.id;
    leave.reviewedDate = new Date();
    if (comments) leave.comments = comments;
    
    await leave.save();
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: MESSAGES.LEAVE_APPROVED,
      data: leave
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject leave application
// @route   PUT /api/leaves/:id/reject
// @access  Private (Manager)
exports.rejectLeave = async (req, res, next) => {
  try {
    const { comments } = req.body;
    const leave = await Leave.findById(req.params.id);
    
    if (!leave) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.LEAVE_NOT_FOUND
      });
    }
    
    // Check if manager is authorized
    if (leave.managerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: MESSAGES.FORBIDDEN
      });
    }
    
    // Check if already processed
    if (leave.status !== LEAVE_STATUS.PENDING) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Leave already processed'
      });
    }
    
    // Reject leave
    leave.status = LEAVE_STATUS.REJECTED;
    leave.reviewedBy = req.user.id;
    leave.reviewedDate = new Date();
    if (comments) leave.comments = comments;
    
    await leave.save();
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: MESSAGES.LEAVE_REJECTED,
      data: leave
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get leave balance for employee
// @route   GET /api/leaves/balance
// @access  Private
exports.getLeaveBalance = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.USER_NOT_FOUND
      });
    }
    
    const leaveBalance = user.leaveBalance;
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: leaveBalance
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get team leave summary (for manager)
// @route   GET /api/leaves/team-summary
// @access  Private (Manager)
exports.getTeamLeaveSummary = async (req, res, next) => {
  try {
    const { year = new Date().getFullYear(), month } = req.query;
    
    // Get team members
    const teamMembers = await User.find({ 
      managerId: req.user.id,
      isActive: true 
    }).select('_id name email designation');
    
    const teamIds = teamMembers.map(member => member._id);
    
    // Build date filter
    let dateFilter = {};
    if (month) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      dateFilter = {
        startDate: { $gte: startDate, $lte: endDate }
      };
    } else {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31);
      dateFilter = {
        startDate: { $gte: startDate, $lte: endDate }
      };
    }
    
    // Get leaves for team
    const leaves = await Leave.find({
      employeeId: { $in: teamIds },
      ...dateFilter,
      status: LEAVE_STATUS.APPROVED
    });
    
    // Group by employee
    const summary = teamMembers.map(member => {
      const memberLeaves = leaves.filter(l => l.employeeId.toString() === member._id.toString());
      const totalDays = memberLeaves.reduce((sum, l) => sum + l.numberOfDays, 0);
      
      return {
        employee: member,
        totalLeaves: memberLeaves.length,
        totalDays,
        leaves: memberLeaves
      };
    });
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
};