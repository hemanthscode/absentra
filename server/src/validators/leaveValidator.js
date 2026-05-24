const LeavePolicy = require('../models/LeavePolicy');
const Leave = require('../models/Leave');
const { LEAVE_STATUS, LEAVE_TYPES } = require('../config/constants');
const { calculateWorkingDaysSync } = require('./dateUtils');

// Check if employee has sufficient leave balance
exports.checkLeaveBalance = async (employee, leaveType, requestedDays) => {
  const balance = employee.leaveBalance[leaveType];
  
  if (leaveType === LEAVE_TYPES.UNPAID) {
    // Unpaid leave doesn't require balance check
    return {
      hasBalance: true,
      message: 'Unpaid leave approved'
    };
  }
  
  if (balance >= requestedDays) {
    return {
      hasBalance: true,
      message: 'Sufficient balance available',
      balance: balance,
      requested: requestedDays
    };
  } else {
    return {
      hasBalance: false,
      message: `Insufficient ${leaveType} leave balance. Available: ${balance}, Requested: ${requestedDays}`
    };
  }
};

// Update leave balance after approval
exports.updateLeaveBalance = async (employee, leaveType, days) => {
  try {
    if (leaveType === LEAVE_TYPES.UNPAID) {
      return true; // Unpaid leave doesn't affect balance
    }
    
    const currentBalance = employee.leaveBalance[leaveType];
    
    if (currentBalance >= days) {
      employee.leaveBalance[leaveType] = currentBalance - days;
      await employee.save();
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error updating leave balance:', error);
    return false;
  }
};

// Revert leave balance (for cancellation/rejection)
exports.revertLeaveBalance = async (employee, leaveType, days) => {
  try {
    if (leaveType === LEAVE_TYPES.UNPAID) {
      return true;
    }
    
    employee.leaveBalance[leaveType] += days;
    await employee.save();
    return true;
  } catch (error) {
    console.error('Error reverting leave balance:', error);
    return false;
  }
};

// Check if leave dates conflict with existing leaves
exports.checkDateConflict = async (employeeId, startDate, endDate, excludeLeaveId = null) => {
  const overlappingLeaves = await Leave.find({
    employeeId,
    status: { $in: [LEAVE_STATUS.PENDING, LEAVE_STATUS.APPROVED] },
    _id: { $ne: excludeLeaveId },
    $or: [
      { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
    ]
  });
  
  if (overlappingLeaves.length > 0) {
    return {
      hasConflict: true,
      conflictingLeaves: overlappingLeaves,
      message: 'Leave dates conflict with existing application'
    };
  }
  
  return {
    hasConflict: false,
    message: 'No conflict found'
  };
};

// Validate leave against policy
exports.validateAgainstPolicy = async (leaveType, startDate, endDate, employee) => {
  const policy = await LeavePolicy.getPolicyByType(leaveType);
  
  if (!policy) {
    return {
      isValid: false,
      message: `No policy found for leave type: ${leaveType}`
    };
  }
  
  // Check max consecutive days
  const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
  if (days > policy.maxConsecutiveDays) {
    return {
      isValid: false,
      message: `Cannot apply for more than ${policy.maxConsecutiveDays} consecutive ${leaveType} leaves. Requested: ${days} days`
    };
  }
  
  // Check department applicability
  if (policy.applicableToDepartments && policy.applicableToDepartments.length > 0) {
    if (!policy.applicableToDepartments.includes(employee.department)) {
      return {
        isValid: false,
        message: `${leaveType} leave is not applicable for ${employee.department} department`
      };
    }
  }
  
  // Check designation applicability
  if (policy.applicableToDesignations && policy.applicableToDesignations.length > 0) {
    if (!policy.applicableToDesignations.includes(employee.designation)) {
      return {
        isValid: false,
        message: `${leaveType} leave is not applicable for ${employee.designation} designation`
      };
    }
  }
  
  return {
    isValid: true,
    policy,
    message: 'Validation passed'
  };
};

// Calculate remaining leave for the year
exports.calculateRemainingLeave = (employee, leaveType, year) => {
  return employee.leaveBalance[leaveType];
};

// Get leave summary for employee
exports.getLeaveSummary = async (employeeId, year) => {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);
  
  const leaves = await Leave.find({
    employeeId,
    startDate: { $gte: startDate, $lte: endDate },
    status: LEAVE_STATUS.APPROVED
  });
  
  const summary = {
    totalLeaves: leaves.length,
    totalDays: leaves.reduce((sum, l) => sum + l.numberOfDays, 0),
    byType: {}
  };
  
  leaves.forEach(leave => {
    if (!summary.byType[leave.leaveType]) {
      summary.byType[leave.leaveType] = {
        count: 0,
        days: 0
      };
    }
    summary.byType[leave.leaveType].count++;
    summary.byType[leave.leaveType].days += leave.numberOfDays;
  });
  
  return summary;
};

// Check if employee can apply for leave based on probation period
exports.checkProbationPeriod = (joiningDate, requiredMonths = 3) => {
  const today = new Date();
  const joinDate = new Date(joiningDate);
  const monthsDiff = (today.getFullYear() - joinDate.getFullYear()) * 12 + 
                     (today.getMonth() - joinDate.getMonth());
  
  if (monthsDiff < requiredMonths) {
    return {
      isEligible: false,
      message: `Employee must complete ${requiredMonths} months of probation before applying for leave`
    };
  }
  
  return {
    isEligible: true,
    message: 'Employee is eligible for leave'
  };
};