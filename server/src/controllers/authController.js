const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { HTTP_STATUS, MESSAGES, USER_ROLES, USER_GENDER } = require('../config/constants');

// Generate JWT Token
const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// @desc    Register new user (Admin only)
// @route   POST /api/auth/register
// @access  Private/Admin
exports.register = async (req, res, next) => {
  try {
    const { 
      employeeId, name, email, password, role, gender, department, 
      designation, managerId, joiningDate, dateOfBirth, contactNumber, address 
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { employeeId }] 
    });
    
    if (existingUser) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: MESSAGES.DUPLICATE_EMAIL
      });
    }

    // Auto-assign manager/admin based on role (only if no managerId provided)
    let assignedManagerId = managerId || null;
    const userRole = role || USER_ROLES.EMPLOYEE;
    
    if (!assignedManagerId) {
      if (userRole === USER_ROLES.EMPLOYEE) {
        // Assign random manager to employee
        const managers = await User.find({ 
          role: USER_ROLES.MANAGER,
          isActive: true 
        }).select('_id');
        
        if (managers.length > 0) {
          const randomIndex = Math.floor(Math.random() * managers.length);
          assignedManagerId = managers[randomIndex]._id;
        }
      } 
      else if (userRole === USER_ROLES.MANAGER) {
        // Assign random admin to manager
        const admins = await User.find({ 
          role: USER_ROLES.ADMIN,
          isActive: true 
        }).select('_id');
        
        if (admins.length > 0) {
          const randomIndex = Math.floor(Math.random() * admins.length);
          assignedManagerId = admins[randomIndex]._id;
        }
      }
      // Admins don't get a manager assigned (remains null)
    }

    // Set default leave balance based on gender
    let leaveBalance = {
      casual: 12,
      sick: 12,
      earned: 15,
      unpaid: 0,
      bereavement: 5,
      marriage: 5
    };

    // Add gender-specific leave balances
    if (gender === 'female') {
      leaveBalance.maternity = 180;
      leaveBalance.paternity = 0;
    } else if (gender === 'male') {
      leaveBalance.maternity = 0;
      leaveBalance.paternity = 15;
    } else {
      leaveBalance.maternity = 0;
      leaveBalance.paternity = 0;
    }

    // Create user
    const user = await User.create({
      employeeId,
      name,
      email,
      password,
      role: userRole,
      gender: gender || USER_GENDER.OTHER,
      department,
      designation,
      managerId: assignedManagerId,
      joiningDate: joiningDate || Date.now(),
      dateOfBirth: dateOfBirth,
      contactNumber,
      address: address || {},
      leaveBalance: leaveBalance
    });

    // Populate manager/admin details for response
    if (user.managerId) {
      await user.populate('managerId', 'name email employeeId designation role');
    }

    // Remove password from response
    user.password = undefined;

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: MESSAGES.USER_CREATED,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check if user exists with password field
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.INVALID_CREDENTIALS
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Account is deactivated. Please contact admin.'
      });
    }

    // Check password
    const isPasswordMatch = await user.comparePassword(password);
    
    if (!isPasswordMatch) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.INVALID_CREDENTIALS
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Generate token
    const token = generateToken(user._id, user.role);

    // Remove password from response
    user.password = undefined;

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: MESSAGES.LOGIN_SUCCESS,
      data: {
        user,
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('managerId', 'name email employeeId designation');

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

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  try {
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: MESSAGES.LOGOUT_SUCCESS
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user.id).select('+password');
    
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.USER_NOT_FOUND
      });
    }
    
    // Check current password
    const isPasswordMatch = await user.comparePassword(currentPassword);
    
    if (!isPasswordMatch) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password (send reset token)
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.USER_NOT_FOUND
      });
    }
    
    // Generate reset token (simplified - in production use crypto)
    const resetToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 3600000; // 1 hour
    await user.save({ validateBeforeSave: false });
    
    // FIXED: Do NOT return reset token in production
    // Send email instead
    try {
      const { sendPasswordResetEmail } = require('../utils/emailService');
      await sendPasswordResetEmail(user, resetToken);
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
      // Still return success to prevent email enumeration
    }
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Password reset email sent. Please check your inbox.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:token
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findOne({
      _id: decoded.id,
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }
    
    // Update password
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    next(error);
  }
};