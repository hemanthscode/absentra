const User = require('../models/User');
const Leave = require('../models/Leave');
const { HTTP_STATUS, MESSAGES, USER_ROLES } = require('../config/constants');

// @desc    Get all users (with filters)
// @route   GET /api/users
// @access  Private/Admin
exports.getAllUsers = async (req, res, next) => {
  try {
    const { 
      role, 
      department, 
      isActive, 
      page = 1, 
      limit = 10,
      search 
    } = req.query;
    
    const query = {};
    
    if (role) query.role = role;
    if (department) query.department = department;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }
    
    const users = await User.find(query)
      .populate('managerId', 'name email employeeId')
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await User.countDocuments(query);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: users,
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

// @desc    Get single user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('managerId', 'name email employeeId designation')
      .select('-password');
    
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.USER_NOT_FOUND
      });
    }
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res, next) => {
  try {
    const { 
      name, 
      department, 
      designation, 
      managerId, 
      role,
      contactNumber,
      address,
      isActive 
    } = req.body;
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.USER_NOT_FOUND
      });
    }
    
    // Update fields
    if (name) user.name = name;
    if (department) user.department = department;
    if (designation) user.designation = designation;
    if (managerId) user.managerId = managerId;
    if (role) user.role = role;
    if (contactNumber) user.contactNumber = contactNumber;
    if (address) user.address = { ...user.address, ...address };
    if (isActive !== undefined) user.isActive = isActive;
    
    await user.save();
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: MESSAGES.USER_UPDATED,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user (soft delete)
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.USER_NOT_FOUND
      });
    }
    
    // Check if user has any pending leaves
    const pendingLeaves = await Leave.findOne({
      employeeId: user._id,
      status: 'pending'
    });
    
    if (pendingLeaves) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Cannot delete user with pending leave applications'
      });
    }
    
    // Soft delete - deactivate user
    user.isActive = false;
    await user.save();
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: MESSAGES.USER_DELETED
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all employees under a manager
// @route   GET /api/users/team/:managerId
// @access  Private/Manager
exports.getTeamMembers = async (req, res, next) => {
  try {
    const { managerId } = req.params;
    
    // Check authorization
    if (req.user.id !== managerId && req.user.role !== USER_ROLES.ADMIN) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: MESSAGES.FORBIDDEN
      });
    }
    
    const teamMembers = await User.find({ 
      managerId, 
      isActive: true 
    })
    .select('name email employeeId designation department leaveBalance')
    .sort({ name: 1 });
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: teamMembers
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update leave balance (Admin/HR)
// @route   PUT /api/users/:id/leave-balance
// @access  Private/Admin
exports.updateLeaveBalance = async (req, res, next) => {
  try {
    const { leaveType, days, action } = req.body; // action: 'add', 'deduct', 'set'
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.USER_NOT_FOUND
      });
    }
    
    const currentBalance = user.leaveBalance[leaveType];
    
    switch(action) {
      case 'add':
        user.leaveBalance[leaveType] = currentBalance + days;
        break;
      case 'deduct':
        if (currentBalance < days) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json({
            success: false,
            message: 'Insufficient leave balance'
          });
        }
        user.leaveBalance[leaveType] = currentBalance - days;
        break;
      case 'set':
        user.leaveBalance[leaveType] = days;
        break;
      default:
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Invalid action. Use add, deduct, or set'
        });
    }
    
    await user.save();
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Leave balance updated successfully',
      data: {
        leaveType,
        previousBalance: currentBalance,
        newBalance: user.leaveBalance[leaveType]
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user statistics (for dashboard)
// @route   GET /api/users/stats
// @access  Private/Admin
exports.getUserStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments({ isActive: true });
    const totalEmployees = await User.countDocuments({ role: USER_ROLES.EMPLOYEE, isActive: true });
    const totalManagers = await User.countDocuments({ role: USER_ROLES.MANAGER, isActive: true });
    const totalAdmins = await User.countDocuments({ role: USER_ROLES.ADMIN, isActive: true });
    
    // Department wise distribution
    const departmentStats = await User.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Recent joins (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentJoins = await User.countDocuments({
      joiningDate: { $gte: thirtyDaysAgo },
      isActive: true
    });
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        total: {
          all: totalUsers,
          employees: totalEmployees,
          managers: totalManagers,
          admins: totalAdmins
        },
        departmentDistribution: departmentStats,
        recentJoins
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search users
// @route   GET /api/users/search/:query
// @access  Private/Admin
exports.searchUsers = async (req, res, next) => {
  try {
    const { query } = req.params;
    const { limit = 10 } = req.query;
    
    const users = await User.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { employeeId: { $regex: query, $options: 'i' } }
      ],
      isActive: true
    })
    .select('name email employeeId designation department role')
    .limit(parseInt(limit));
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: users
    });
  } catch (error) {
    next(error);
  }
};