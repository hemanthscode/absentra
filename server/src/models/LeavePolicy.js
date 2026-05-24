const mongoose = require('mongoose');
const { LEAVE_TYPES, DEFAULT_LEAVE_POLICIES } = require('../config/constants');

const leavePolicySchema = new mongoose.Schema({
  policyName: {
    type: String,
    required: [true, 'Policy name is required'],
    unique: true,
    trim: true
  },
  leaveType: {
    type: String,
    enum: Object.values(LEAVE_TYPES),
    required: true,
    unique: true
  },
  totalDaysPerYear: {
    type: Number,
    required: true,
    min: [0, 'Total days cannot be negative']
  },
  maxConsecutiveDays: {
    type: Number,
    default: 30,
    min: [1, 'Max consecutive days must be at least 1']
  },
  minDaysBeforeApply: {
    type: Number,
    default: 1,
    min: [0, 'Min days before apply cannot be negative']
  },
  requiresApproval: {
    type: Boolean,
    default: true
  },
  carryForward: {
    type: Boolean,
    default: false
  },
  maxCarryForwardDays: {
    type: Number,
    default: 0
  },
  applicableToDepartments: [{
    type: String,
    trim: true
  }],
  applicableToDesignations: [{
    type: String,
    trim: true
  }],
  documentsRequired: {
    type: Boolean,
    default: false
  },
  documentsList: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

// Static method to get policy by leave type
leavePolicySchema.statics.getPolicyByType = function(leaveType) {
  return this.findOne({ leaveType, isActive: true });
};

// Static method to get all active policies
leavePolicySchema.statics.getAllActivePolicies = function() {
  return this.find({ isActive: true }).sort({ leaveType: 1 });
};

// Instance method to check if department is applicable
leavePolicySchema.methods.isDepartmentApplicable = function(department) {
  if (!this.applicableToDepartments.length) return true;
  return this.applicableToDepartments.includes(department);
};

// Instance method to check if designation is applicable
leavePolicySchema.methods.isDesignationApplicable = function(designation) {
  if (!this.applicableToDesignations.length) return true;
  return this.applicableToDesignations.includes(designation);
};

// Pre-save middleware to set default totalDaysPerYear if not provided
leavePolicySchema.pre('save', function(next) {
  if (!this.totalDaysPerYear && DEFAULT_LEAVE_POLICIES[this.leaveType]) {
    this.totalDaysPerYear = DEFAULT_LEAVE_POLICIES[this.leaveType];
  }
  next();
});

const LeavePolicy = mongoose.model('LeavePolicy', leavePolicySchema);

module.exports = LeavePolicy;