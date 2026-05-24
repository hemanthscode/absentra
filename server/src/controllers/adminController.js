const LeavePolicy = require('../models/LeavePolicy');
const Holiday = require('../models/Holiday');
const User = require('../models/User');
const Leave = require('../models/Leave');
const { HTTP_STATUS, MESSAGES, LEAVE_TYPES, DEFAULT_LEAVE_POLICIES } = require('../config/constants');

// ==================== LEAVE POLICY MANAGEMENT ====================

// @desc    Create leave policy
// @route   POST /api/admin/policies
// @access  Private/Admin
exports.createPolicy = async (req, res, next) => {
  try {
    const policyData = req.body;
    
    // Check if policy already exists for this leave type
    const existingPolicy = await LeavePolicy.findOne({ leaveType: policyData.leaveType });
    if (existingPolicy) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: `Policy for ${policyData.leaveType} already exists`
      });
    }
    
    const policy = await LeavePolicy.create(policyData);
    
    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Leave policy created successfully',
      data: policy
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all leave policies
// @route   GET /api/admin/policies
// @access  Private/Admin
exports.getAllPolicies = async (req, res, next) => {
  try {
    const policies = await LeavePolicy.find().sort({ leaveType: 1 });
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: policies
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single policy
// @route   GET /api/admin/policies/:id
// @access  Private/Admin
exports.getPolicyById = async (req, res, next) => {
  try {
    const policy = await LeavePolicy.findById(req.params.id);
    
    if (!policy) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.POLICY_NOT_FOUND
      });
    }
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: policy
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update leave policy
// @route   PUT /api/admin/policies/:id
// @access  Private/Admin
exports.updatePolicy = async (req, res, next) => {
  try {
    const policy = await LeavePolicy.findById(req.params.id);
    
    if (!policy) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.POLICY_NOT_FOUND
      });
    }
    
    const updatedPolicy = await LeavePolicy.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: MESSAGES.POLICY_UPDATED,
      data: updatedPolicy
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete leave policy
// @route   DELETE /api/admin/policies/:id
// @access  Private/Admin
exports.deletePolicy = async (req, res, next) => {
  try {
    const policy = await LeavePolicy.findById(req.params.id);
    
    if (!policy) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.POLICY_NOT_FOUND
      });
    }
    
    await policy.deleteOne();
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Leave policy deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Initialize default policies
// @route   POST /api/admin/policies/init
// @access  Private/Admin
exports.initDefaultPolicies = async (req, res, next) => {
  try {
    const existingPolicies = await LeavePolicy.countDocuments();
    
    if (existingPolicies > 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Policies already exist. Use update instead.'
      });
    }
    
    const defaultPolicies = Object.keys(DEFAULT_LEAVE_POLICIES).map(leaveType => ({
      policyName: `${leaveType.charAt(0).toUpperCase() + leaveType.slice(1)} Leave Policy`,
      leaveType,
      totalDaysPerYear: DEFAULT_LEAVE_POLICIES[leaveType],
      maxConsecutiveDays: leaveType === 'maternity' ? 180 : leaveType === 'paternity' ? 15 : 30,
      minDaysBeforeApply: 1,
      requiresApproval: true,
      carryForward: leaveType === 'earned',
      maxCarryForwardDays: leaveType === 'earned' ? 15 : 0,
      isActive: true
    }));
    
    const policies = await LeavePolicy.insertMany(defaultPolicies);
    
    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Default policies initialized',
      data: policies
    });
  } catch (error) {
    next(error);
  }
};

// ==================== HOLIDAY MANAGEMENT ====================

// @desc    Add holiday
// @route   POST /api/admin/holidays
// @access  Private/Admin
exports.addHoliday = async (req, res, next) => {
  try {
    const holidayData = req.body;
    
    // Check if holiday already exists for this date
    const existingHoliday = await Holiday.findOne({ date: new Date(holidayData.date) });
    if (existingHoliday) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: 'Holiday already exists for this date'
      });
    }
    
    const holiday = await Holiday.create(holidayData);
    
    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: MESSAGES.HOLIDAY_ADDED,
      data: holiday
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all holidays
// @route   GET /api/admin/holidays
// @access  Private/Admin
exports.getAllHolidays = async (req, res, next) => {
  try {
    const { year, type, page = 1, limit = 50 } = req.query;
    
    const query = {};
    if (year) query.year = parseInt(year);
    if (type) query.type = type;
    
    const holidays = await Holiday.find(query)
      .sort({ date: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Holiday.countDocuments(query);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: holidays,
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

// @desc    Update holiday
// @route   PUT /api/admin/holidays/:id
// @access  Private/Admin
exports.updateHoliday = async (req, res, next) => {
  try {
    const holiday = await Holiday.findById(req.params.id);
    
    if (!holiday) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.HOLIDAY_NOT_FOUND
      });
    }
    
    const updatedHoliday = await Holiday.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Holiday updated successfully',
      data: updatedHoliday
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete holiday
// @route   DELETE /api/admin/holidays/:id
// @access  Private/Admin
exports.deleteHoliday = async (req, res, next) => {
  try {
    const holiday = await Holiday.findById(req.params.id);
    
    if (!holiday) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.HOLIDAY_NOT_FOUND
      });
    }
    
    await holiday.deleteOne();
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Holiday deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk add holidays
// @route   POST /api/admin/holidays/bulk
// @access  Private/Admin
exports.bulkAddHolidays = async (req, res, next) => {
  try {
    const { holidays } = req.body;
    
    if (!Array.isArray(holidays) || holidays.length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Please provide an array of holidays'
      });
    }
    
    const results = await Holiday.insertMany(holidays, { ordered: false });
    
    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: `${results.length} holidays added successfully`,
      data: results
    });
  } catch (error) {
    // Handle duplicate errors
    if (error.code === 11000) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: 'Some holidays already exist',
        error: error.message
      });
    }
    next(error);
  }
};

// ==================== SYSTEM MANAGEMENT ====================

// @desc    Get system dashboard stats
// @route   GET /api/admin/dashboard-stats
// @access  Private/Admin
exports.getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    
    // User stats
    const totalUsers = await User.countDocuments({ isActive: true });
    const totalEmployees = await User.countDocuments({ role: 'employee', isActive: true });
    const totalManagers = await User.countDocuments({ role: 'manager', isActive: true });
    
    // Leave stats
    const pendingLeaves = await Leave.countDocuments({ status: 'pending' });
    const approvedThisMonth = await Leave.countDocuments({
      status: 'approved',
      reviewedDate: { $gte: startOfMonth }
    });
    const totalLeavesThisYear = await Leave.countDocuments({
      status: 'approved',
      startDate: { $gte: startOfYear }
    });
    
    // Leave by type
    const leaveByType = await Leave.aggregate([
      { $match: { status: 'approved', startDate: { $gte: startOfYear } } },
      { $group: { _id: '$leaveType', count: { $sum: 1 }, totalDays: { $sum: '$numberOfDays' } } }
    ]);
    
    // Monthly trend
    const monthlyTrend = await Leave.aggregate([
      { $match: { status: 'approved', startDate: { $gte: startOfYear } } },
      {
        $group: {
          _id: { month: { $month: '$startDate' } },
          count: { $sum: 1 },
          totalDays: { $sum: '$numberOfDays' }
        }
      },
      { $sort: { '_id.month': 1 } }
    ]);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          employees: totalEmployees,
          managers: totalManagers
        },
        leaves: {
          pending: pendingLeaves,
          approvedThisMonth,
          totalThisYear: totalLeavesThisYear
        },
        leaveByType,
        monthlyTrend
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset employee leave balance for new year
// @route   POST /api/admin/reset-leave-balance
// @access  Private/Admin
exports.resetYearlyLeaveBalance = async (req, res, next) => {
  try {
    const { year, carryForwardPercentage = 50 } = req.body;
    
    const users = await User.find({ isActive: true });
    
    const results = [];
    for (const user of users) {
      const oldBalance = { ...user.leaveBalance };
      
      // Calculate carry forward (e.g., 50% of remaining earned leaves)
      const earnedCarryForward = Math.floor(user.leaveBalance.earned * (carryForwardPercentage / 100));
      const maxCarryForward = 15; // Default max carry forward days
      const finalCarryForward = Math.min(earnedCarryForward, maxCarryForward);
      
      // Reset balances with new year allocations
      user.leaveBalance = {
        casual: 12,
        sick: 12,
        earned: 15 + finalCarryForward,
        unpaid: 0,
        maternity: 180,
        paternity: 15,
        bereavement: 5,
        marriage: 5
      };
      
      await user.save();
      
      results.push({
        userId: user._id,
        name: user.name,
        oldBalance,
        newBalance: user.leaveBalance
      });
    }
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `Leave balance reset for ${results.length} users for year ${year}`,
      data: results
    });
  } catch (error) {
    next(error);
  }
};