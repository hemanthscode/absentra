const mongoose = require('mongoose');
const { LEAVE_STATUS, LEAVE_TYPES } = require('../config/constants');

const leaveSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Employee ID is required']
  },
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Manager ID is required']
  },
  leaveType: {
    type: String,
    enum: Object.values(LEAVE_TYPES),
    required: [true, 'Leave type is required']
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  numberOfDays: {
    type: Number,
    required: true,
    min: [0.5, 'Number of days must be at least 0.5'],
    max: [365, 'Number of days cannot exceed 365']
  },
  reason: {
    type: String,
    required: [true, 'Reason is required'],
    trim: true,
    minlength: [5, 'Reason must be at least 5 characters'],
    maxlength: [500, 'Reason cannot exceed 500 characters']
  },
  status: {
    type: String,
    enum: Object.values(LEAVE_STATUS),
    default: LEAVE_STATUS.PENDING
  },
  appliedDate: {
    type: Date,
    default: Date.now
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedDate: {
    type: Date,
    default: null
  },
  comments: {
    type: String,
    trim: true,
    maxlength: [500, 'Comments cannot exceed 500 characters'],
    default: null
  },
  attachments: [{
    filename: String,
    path: String,
    uploadedAt: Date
  }],
  isHalfDay: {
    type: Boolean,
    default: false
  },
  halfDaySession: {
    type: String,
    enum: ['first_half', 'second_half', null],
    default: null
  },
  contactDuringLeave: {
    type: String,
    trim: true,
    default: null
  },
  emergencyContact: {
    type: String,
    trim: true,
    default: null
  }
}, {
  timestamps: true
});

// Index for faster queries
leaveSchema.index({ employeeId: 1, status: 1 });
leaveSchema.index({ managerId: 1, status: 1 });
leaveSchema.index({ startDate: -1, endDate: -1 });

// Validate that end date is after start date
leaveSchema.pre('save', function(next) {
  if (this.startDate > this.endDate) {
    next(new Error('End date must be after start date'));
  }
  next();
});

// Virtual for duration in days
leaveSchema.virtual('duration').get(function() {
  const diffTime = Math.abs(this.endDate - this.startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return this.isHalfDay ? diffDays + 0.5 : diffDays;
});

// Static method to find overlapping leaves
leaveSchema.statics.findOverlappingLeaves = async function(employeeId, startDate, endDate, excludeLeaveId = null) {
  const query = {
    employeeId,
    status: { $in: [LEAVE_STATUS.PENDING, LEAVE_STATUS.APPROVED] },
    $or: [
      { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
    ]
  };
  
  if (excludeLeaveId) {
    query._id = { $ne: excludeLeaveId };
  }
  
  return await this.find(query);
};

// Instance method to check if leave can be cancelled
leaveSchema.methods.canBeCancelled = function() {
  return this.status === LEAVE_STATUS.PENDING;
};

// Instance method to check if leave can be edited
leaveSchema.methods.canBeEdited = function() {
  return this.status === LEAVE_STATUS.PENDING;
};

const Leave = mongoose.model('Leave', leaveSchema);

module.exports = Leave;