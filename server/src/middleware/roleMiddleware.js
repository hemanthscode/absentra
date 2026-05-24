const { HTTP_STATUS, MESSAGES, USER_ROLES } = require('../config/constants');

// Check if user has specific role
const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: MESSAGES.FORBIDDEN
      });
    }

    next();
  };
};

// Allow only admin access
exports.isAdmin = checkRole([USER_ROLES.ADMIN]);

// Allow only manager access
exports.isManager = checkRole([USER_ROLES.MANAGER]);

// Allow only employee access
exports.isEmployee = checkRole([USER_ROLES.EMPLOYEE]);

// Allow admin or manager access
exports.isAdminOrManager = checkRole([USER_ROLES.ADMIN, USER_ROLES.MANAGER]);

// Allow admin, manager, or employee access (basically any authenticated user)
exports.isAuthenticated = checkRole([USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.EMPLOYEE]);

// Check if user is manager of the requested employee
exports.isManagerOfEmployee = async (req, res, next) => {
  try {
    const { userId, employeeId } = req.params;
    const targetUserId = userId || employeeId;

    if (!targetUserId && !req.body.employeeId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Employee ID is required'
      });
    }

    const targetId = targetUserId || req.body.employeeId;

    // Admin can access everything
    if (req.user.role === USER_ROLES.ADMIN) {
      return next();
    }

    // Manager check
    if (req.user.role === USER_ROLES.MANAGER) {
      const User = require('../models/User');
      const targetUser = await User.findById(targetId);

      if (!targetUser) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if the logged-in manager is the manager of this employee
      if (targetUser.managerId && targetUser.managerId.toString() === req.user.id.toString()) {
        return next();
      }

      // If trying to access own data as manager
      if (targetId.toString() === req.user.id.toString()) {
        return next();
      }
    }

    // Employee can only access their own data
    if (req.user.role === USER_ROLES.EMPLOYEE) {
      if (targetId.toString() === req.user.id.toString()) {
        return next();
      }
    }

    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: MESSAGES.FORBIDDEN
    });
  } catch (error) {
    next(error);
  }
};

// Check if user is self or has admin/manager role
exports.isSelfOrAuthorized = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Admin can access everything
    if (req.user.role === USER_ROLES.ADMIN) {
      return next();
    }

    // Check if accessing own data
    if (userId && userId.toString() === req.user.id.toString()) {
      return next();
    }

    // Manager can access team members' data
    if (req.user.role === USER_ROLES.MANAGER && userId) {
      const User = require('../models/User');
      const targetUser = await User.findById(userId);

      if (targetUser && targetUser.managerId && targetUser.managerId.toString() === req.user.id.toString()) {
        return next();
      }
    }

    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: MESSAGES.FORBIDDEN
    });
  } catch (error) {
    next(error);
  }
};

// Check if user can manage leave (manager of employee or admin)
exports.canManageLeave = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Admin can manage all leaves
    if (req.user.role === USER_ROLES.ADMIN) {
      return next();
    }

    // For manager, check if the leave belongs to their team member
    if (req.user.role === USER_ROLES.MANAGER) {
      const Leave = require('../models/Leave');
      const leave = await Leave.findById(id);

      if (!leave) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Leave not found'
        });
      }

      // Check if the manager is the manager of the employee who applied
      if (leave.managerId && leave.managerId.toString() === req.user.id.toString()) {
        return next();
      }
    }

    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: MESSAGES.FORBIDDEN
    });
  } catch (error) {
    next(error);
  }
};