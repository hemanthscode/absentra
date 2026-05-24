const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { USER_ROLES, USER_GENDER } = require('../config/constants');

const userSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: [true, 'Employee ID is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  gender: {
    type: String,
    enum: Object.values(USER_GENDER),
    required: [true, 'Gender is required'],
    default: USER_GENDER.OTHER
  },
  role: {
    type: String,
    enum: Object.values(USER_ROLES),
    default: USER_ROLES.EMPLOYEE,
    required: true
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true
  },
  designation: {
    type: String,
    required: [true, 'Designation is required'],
    trim: true
  },
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  joiningDate: {
    type: Date,
    required: [true, 'Joining date is required'],
    default: Date.now
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required']
  },
  contactNumber: {
    type: String,
    required: [true, 'Contact number is required'],
    match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit contact number']
  },
  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
    country: { type: String, default: 'India', trim: true }
  },
  profilePicture: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  leaveBalance: {
    casual: { type: Number, default: 0 },
    sick: { type: Number, default: 0 },
    earned: { type: Number, default: 0 },
    unpaid: { type: Number, default: 0 },
    maternity: { type: Number, default: 0 },
    paternity: { type: Number, default: 0 },
    bereavement: { type: Number, default: 0 },
    marriage: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Virtual for full address
userSchema.virtual('fullAddress').get(function() {
  const { street, city, state, pincode, country } = this.address;
  return `${street}, ${city}, ${state} - ${pincode}, ${country}`;
});

// Instance method to check if user is manager
userSchema.methods.isManager = function() {
  return this.role === USER_ROLES.MANAGER;
};

// Instance method to check if user is admin
userSchema.methods.isAdmin = function() {
  return this.role === USER_ROLES.ADMIN;
};

// Instance method to check if leave type is allowed for gender
userSchema.methods.isLeaveTypeAllowed = function(leaveType) {
  const { USER_GENDER, LEAVE_TYPES } = require('../config/constants');
  
  if (leaveType === LEAVE_TYPES.MATERNITY && this.gender !== USER_GENDER.FEMALE) {
    return false;
  }
  if (leaveType === LEAVE_TYPES.PATERNITY && this.gender !== USER_GENDER.MALE) {
    return false;
  }
  return true;
};

// Static method to get employee by employeeId
userSchema.statics.findByEmployeeId = function(employeeId) {
  return this.findOne({ employeeId });
};

// Static method to get users by gender
userSchema.statics.findByGender = function(gender) {
  return this.find({ gender, isActive: true });
};

const User = mongoose.model('User', userSchema);

module.exports = User;