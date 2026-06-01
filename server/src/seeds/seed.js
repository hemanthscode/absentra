/**
 * Database Seeding Script
 * Usage: npm run seed
 * 
 * This script matches the Postman collection expectations
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

// Load environment variables
dotenv.config();

// Import models
const User = require('../models/User');
const Leave = require('../models/Leave');
const LeavePolicy = require('../models/LeavePolicy');
const Holiday = require('../models/Holiday');

// Import constants
const { LEAVE_TYPES, LEAVE_STATUS, USER_ROLES, USER_GENDER } = require('../config/constants');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[39m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ️ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  progress: (msg) => console.log(`${colors.cyan}🔄 ${msg}${colors.reset}`),
  data: (msg) => console.log(`${colors.magenta}📊 ${msg}${colors.reset}`)
};

// Helper function to get date offsets (matching Postman pre-request script)
const getDate = (daysOffset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  // Set to noon UTC to avoid timezone issues
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0));
};

// Helper function to format date for display
const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

// Helper function to get day name from date
const getDayName = (date) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
};

// ==================== SEED DATA DEFINITIONS ====================

// Leave Policies Data
const leavePoliciesData = [
  {
    policyName: 'Casual Leave Policy',
    leaveType: LEAVE_TYPES.CASUAL,
    totalDaysPerYear: 12,
    maxConsecutiveDays: 5,
    minDaysBeforeApply: 1,
    requiresApproval: true,
    carryForward: false,
    maxCarryForwardDays: 0,
    isActive: true,
    description: 'Casual leave for personal emergencies and short breaks'
  },
  {
    policyName: 'Sick Leave Policy',
    leaveType: LEAVE_TYPES.SICK,
    totalDaysPerYear: 12,
    maxConsecutiveDays: 7,
    minDaysBeforeApply: 0,
    requiresApproval: true,
    carryForward: false,
    maxCarryForwardDays: 0,
    isActive: true,
    description: 'Sick leave for medical purposes'
  },
  {
    policyName: 'Earned Leave Policy',
    leaveType: LEAVE_TYPES.EARNED,
    totalDaysPerYear: 15,
    maxConsecutiveDays: 15,
    minDaysBeforeApply: 3,
    requiresApproval: true,
    carryForward: true,
    maxCarryForwardDays: 15,
    isActive: true,
    description: 'Annual earned/privilege leave'
  },
  {
    policyName: 'Unpaid Leave Policy',
    leaveType: LEAVE_TYPES.UNPAID,
    totalDaysPerYear: 0,
    maxConsecutiveDays: 30,
    minDaysBeforeApply: 7,
    requiresApproval: true,
    carryForward: false,
    maxCarryForwardDays: 0,
    isActive: true,
    description: 'Unpaid leave beyond available balance'
  },
  {
    policyName: 'Maternity Leave Policy',
    leaveType: LEAVE_TYPES.MATERNITY,
    totalDaysPerYear: 180,
    maxConsecutiveDays: 180,
    minDaysBeforeApply: 30,
    requiresApproval: true,
    carryForward: false,
    maxCarryForwardDays: 0,
    isActive: true,
    description: 'Maternity leave for female employees',
    applicableToDepartments: ['Engineering', 'HR', 'Sales', 'Marketing']
  },
  {
    policyName: 'Paternity Leave Policy',
    leaveType: LEAVE_TYPES.PATERNITY,
    totalDaysPerYear: 15,
    maxConsecutiveDays: 15,
    minDaysBeforeApply: 15,
    requiresApproval: true,
    carryForward: false,
    maxCarryForwardDays: 0,
    isActive: true,
    description: 'Paternity leave for male employees'
  },
  {
    policyName: 'Bereavement Leave Policy',
    leaveType: LEAVE_TYPES.BEREAVEMENT,
    totalDaysPerYear: 5,
    maxConsecutiveDays: 5,
    minDaysBeforeApply: 0,
    requiresApproval: true,
    carryForward: false,
    maxCarryForwardDays: 0,
    isActive: true,
    description: 'Leave in case of family bereavement'
  },
  {
    policyName: 'Marriage Leave Policy',
    leaveType: LEAVE_TYPES.MARRIAGE,
    totalDaysPerYear: 5,
    maxConsecutiveDays: 5,
    minDaysBeforeApply: 15,
    requiresApproval: true,
    carryForward: false,
    maxCarryForwardDays: 0,
    isActive: true,
    description: 'Leave for own marriage'
  }
];

// Users Data - MATCHING POSTMAN COLLECTION
const usersData = [
  // Admin User (matches Postman)
  {
    employeeId: 'ADMIN001',
    name: 'System Admin',
    email: 'admin@absentra.com',
    password: 'Admin@123',
    role: USER_ROLES.ADMIN,
    gender: USER_GENDER.MALE,
    department: 'Administration',
    designation: 'System Administrator',
    joiningDate: new Date('2020-01-01'),
    dateOfBirth: new Date('1990-01-01'),
    contactNumber: '9999999999',
    address: {
      street: '123 Admin Street',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      country: 'India'
    },
    isActive: true,
    leaveBalance: {
      casual: 12,
      sick: 12,
      earned: 15,
      unpaid: 0,
      maternity: 0,
      paternity: 15,
      bereavement: 5,
      marriage: 5
    }
  },
  // Manager (matches Postman: John Manager)
  {
    employeeId: 'MGR001',
    name: 'John Manager',
    email: 'manager@absentra.com',
    password: 'Manager@123',
    role: USER_ROLES.MANAGER,
    gender: USER_GENDER.MALE,
    department: 'Engineering',
    designation: 'Engineering Manager',
    joiningDate: new Date('2019-06-01'),
    dateOfBirth: new Date('1985-05-15'),
    contactNumber: '8888888888',
    address: {
      street: '45 Manager Colony',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560002',
      country: 'India'
    },
    isActive: true,
    leaveBalance: {
      casual: 12,
      sick: 12,
      earned: 15,
      unpaid: 0,
      maternity: 0,
      paternity: 15,
      bereavement: 5,
      marriage: 5
    }
  },
  // Employee 1 - Male (matches Postman: Rajesh Kumar)
  {
    employeeId: 'EMP001',
    name: 'Rajesh Kumar',
    email: 'employee@absentra.com',
    password: 'Employee@123',
    role: USER_ROLES.EMPLOYEE,
    gender: USER_GENDER.MALE,
    department: 'Engineering',
    designation: 'Software Engineer',
    joiningDate: new Date('2022-01-15'),
    dateOfBirth: new Date('1995-08-20'),
    contactNumber: '7777777777',
    address: {
      street: '78 Tech Park',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560004',
      country: 'India'
    },
    isActive: true,
    leaveBalance: {
      casual: 12,
      sick: 12,
      earned: 15,
      unpaid: 0,
      maternity: 0,
      paternity: 15,
      bereavement: 5,
      marriage: 5
    }
  },
  // Employee 2 - Female (matches Postman: Priya Sharma)
  {
    employeeId: 'EMP002',
    name: 'Priya Sharma',
    email: 'employee2@absentra.com',
    password: 'Employee@123',
    role: USER_ROLES.EMPLOYEE,
    gender: USER_GENDER.FEMALE,
    department: 'Engineering',
    designation: 'Frontend Developer',
    joiningDate: new Date('2022-06-20'),
    dateOfBirth: new Date('1996-03-10'),
    contactNumber: '6666666666',
    address: {
      street: '234 Green Valley',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560005',
      country: 'India'
    },
    isActive: true,
    leaveBalance: {
      casual: 12,
      sick: 12,
      earned: 15,
      unpaid: 0,
      maternity: 180,
      paternity: 0,
      bereavement: 5,
      marriage: 5
    }
  },
  // Additional employee for more test coverage
  {
    employeeId: 'EMP003',
    name: 'Test Employee',
    email: 'test@absentra.com',
    password: 'Employee@123',
    role: USER_ROLES.EMPLOYEE,
    gender: USER_GENDER.MALE,
    department: 'HR',
    designation: 'HR Executive',
    joiningDate: new Date('2022-02-10'),
    dateOfBirth: new Date('1995-04-18'),
    contactNumber: '7777777773',
    address: {
      street: '56 Lake View',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560006',
      country: 'India'
    },
    isActive: true,
    leaveBalance: {
      casual: 12,
      sick: 12,
      earned: 15,
      unpaid: 0,
      maternity: 0,
      paternity: 15,
      bereavement: 5,
      marriage: 5
    }
  }
];

// Holidays Data - WITH EXPLICIT year AND day fields (matching Postman)
const holidaysData = [
  {
    name: 'Republic Day',
    date: new Date('2026-01-26'),
    day: 'Monday',
    year: 2026,
    type: 'national',
    description: 'Republic Day celebration',
    isOptional: false,
    isActive: true
  },
  {
    name: 'Independence Day',
    date: new Date('2026-08-15'),
    day: 'Saturday',
    year: 2026,
    type: 'national',
    description: 'Independence Day celebration',
    isOptional: false,
    isActive: true
  },
  {
    name: 'Gandhi Jayanti',
    date: new Date('2026-10-02'),
    day: 'Friday',
    year: 2026,
    type: 'national',
    description: 'Gandhi Jayanti',
    isOptional: false,
    isActive: true
  },
  {
    name: 'Diwali',
    date: new Date('2026-10-20'),
    day: 'Tuesday',
    year: 2026,
    type: 'festival',
    description: 'Festival of lights',
    isOptional: false,
    isActive: true
  },
  {
    name: 'Christmas',
    date: new Date('2026-12-25'),
    day: 'Friday',
    year: 2026,
    type: 'festival',
    description: 'Christmas Day',
    isOptional: false,
    isActive: true
  },
  {
    name: 'New Year',
    date: new Date('2026-01-01'),
    day: 'Thursday',
    year: 2026,
    type: 'national',
    description: 'New Year Day',
    isOptional: false,
    isActive: true
  }
];

// Leave Applications Data (matching Postman test flow)
const generateLeaveApplications = (users, managers) => {
  const leaves = [];
  
  // Map for quick lookup
  const userMap = new Map();
  users.forEach(user => {
    userMap.set(user.email, user);
  });
  
  const managerMap = new Map();
  managers.forEach(manager => {
    managerMap.set(manager.email, manager);
  });
  
  // Get specific users
  const employee = userMap.get('employee@absentra.com');
  const manager = managerMap.get('manager@absentra.com');
  
  if (!employee || !manager) {
    console.log('Warning: Could not find employee or manager for leave creation');
    return leaves;
  }
  
  // Calculate dates matching Postman pre-request script
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  const nextMonth = new Date(today);
  nextMonth.setDate(today.getDate() + 30);
  
  // Set to noon UTC to avoid timezone issues
  const tomorrowUTC = new Date(Date.UTC(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 12, 0, 0));
  const nextWeekUTC = new Date(Date.UTC(nextWeek.getFullYear(), nextWeek.getMonth(), nextWeek.getDate(), 12, 0, 0));
  const nextMonthUTC = new Date(Date.UTC(nextMonth.getFullYear(), nextMonth.getMonth(), nextMonth.getDate(), 12, 0, 0));
  
  // 1. Casual Leave (Pending - for approval test) - matches Postman "Apply for Casual Leave"
  leaves.push({
    employeeId: employee._id,
    managerId: manager._id,
    leaveType: LEAVE_TYPES.CASUAL,
    startDate: tomorrowUTC,
    endDate: nextWeekUTC,
    numberOfDays: 7,
    reason: 'Going on a family vacation',
    status: LEAVE_STATUS.PENDING,
    appliedDate: new Date(),
    reviewedBy: null,
    reviewedDate: null,
    comments: null,
    isHalfDay: false,
    contactDuringLeave: '9999999999',
    emergencyContact: '8888888888'
  });
  
  // 2. Sick Leave (Pending - for reject test) - matches Postman "Apply for Sick Leave (Half Day)"
  leaves.push({
    employeeId: employee._id,
    managerId: manager._id,
    leaveType: LEAVE_TYPES.SICK,
    startDate: tomorrowUTC,
    endDate: tomorrowUTC,
    numberOfDays: 0.5,
    reason: "Doctor's appointment",
    status: LEAVE_STATUS.PENDING,
    appliedDate: new Date(),
    reviewedBy: null,
    reviewedDate: null,
    comments: null,
    isHalfDay: true,
    halfDaySession: 'first_half'
  });
  
  // 3. Earned Leave (Pending - for cancel test) - matches Postman "Apply for Earned Leave"
  leaves.push({
    employeeId: employee._id,
    managerId: manager._id,
    leaveType: LEAVE_TYPES.EARNED,
    startDate: nextWeekUTC,
    endDate: nextMonthUTC,
    numberOfDays: 23,
    reason: 'Annual planned vacation',
    status: LEAVE_STATUS.PENDING,
    appliedDate: new Date(),
    reviewedBy: null,
    reviewedDate: null,
    comments: null,
    isHalfDay: false
  });
  
  // 4. Approved Casual Leave (past)
  const pastDate = new Date(today);
  pastDate.setDate(today.getDate() - 15);
  const pastDateUTC = new Date(Date.UTC(pastDate.getFullYear(), pastDate.getMonth(), pastDate.getDate(), 12, 0, 0));
  const pastDateEnd = new Date(today);
  pastDateEnd.setDate(today.getDate() - 13);
  const pastDateEndUTC = new Date(Date.UTC(pastDateEnd.getFullYear(), pastDateEnd.getMonth(), pastDateEnd.getDate(), 12, 0, 0));
  
  leaves.push({
    employeeId: employee._id,
    managerId: manager._id,
    leaveType: LEAVE_TYPES.CASUAL,
    startDate: pastDateUTC,
    endDate: pastDateEndUTC,
    numberOfDays: 3,
    reason: 'Previous vacation',
    status: LEAVE_STATUS.APPROVED,
    appliedDate: new Date(pastDateUTC.getTime() - 7 * 24 * 60 * 60 * 1000),
    reviewedBy: manager._id,
    reviewedDate: new Date(pastDateUTC.getTime() - 3 * 24 * 60 * 60 * 1000),
    comments: 'Approved',
    isHalfDay: false
  });
  
  return leaves;
};

// ==================== MAIN SEED FUNCTION ====================

const seedDatabase = async () => {
  console.log('\n' + '='.repeat(60));
  log.info('ABSENTRA DATABASE SEEDER');
  console.log('='.repeat(60) + '\n');
  
  try {
    // Connect to MongoDB
    log.progress('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    log.success('Connected to MongoDB');
    console.log('');
    
    // ==================== 1. Clear Existing Data ====================
    log.progress('Clearing existing data...');
    
    await User.deleteMany({});
    log.success('Cleared Users collection');
    
    await Leave.deleteMany({});
    log.success('Cleared Leaves collection');
    
    await LeavePolicy.deleteMany({});
    log.success('Cleared LeavePolicies collection');
    
    await Holiday.deleteMany({});
    log.success('Cleared Holidays collection');
    
    console.log('');
    
    // ==================== 2. Seed Leave Policies ====================
    log.progress('Seeding leave policies...');
    const policies = await LeavePolicy.insertMany(leavePoliciesData);
    log.success(`Created ${policies.length} leave policies`);
    
    // Display policies
    policies.forEach(policy => {
      log.data(`${policy.leaveType}: ${policy.totalDaysPerYear} days/year`);
    });
    console.log('');
    
    // ==================== 3. Seed Holidays ====================
    log.progress('Seeding holidays...');
    const holidays = await Holiday.insertMany(holidaysData);
    log.success(`Created ${holidays.length} holidays`);
    
    // Display upcoming holidays
    const today = new Date();
    const upcomingHolidays = holidays
      .filter(h => h.date >= today)
      .sort((a, b) => a.date - b.date)
      .slice(0, 5);
    
    if (upcomingHolidays.length > 0) {
      log.info('Upcoming holidays:');
      upcomingHolidays.forEach(h => {
        log.data(`${formatDate(h.date)} (${h.day}): ${h.name} (${h.type})`);
      });
    }
    console.log('');
    
    // ==================== 4. Seed Users ====================
    log.progress('Seeding users...');
    
    // Hash passwords before inserting
    const usersWithHashedPasswords = await Promise.all(
      usersData.map(async (userData) => {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(userData.password, salt);
        return { ...userData, password: hashedPassword };
      })
    );
    
    const users = await User.insertMany(usersWithHashedPasswords);
    log.success(`Created ${users.length} users`);
    
    // Display user summary
    const adminCount = users.filter(u => u.role === USER_ROLES.ADMIN).length;
    const managerCount = users.filter(u => u.role === USER_ROLES.MANAGER).length;
    const employeeCount = users.filter(u => u.role === USER_ROLES.EMPLOYEE).length;
    const activeCount = users.filter(u => u.isActive).length;
    
    log.data(`Admins: ${adminCount} | Managers: ${managerCount} | Employees: ${employeeCount}`);
    log.data(`Active users: ${activeCount} | Inactive users: ${users.length - activeCount}`);
    
    // Create a map for easy lookup by email (Postman uses emails)
    const userByEmailMap = new Map();
    users.forEach(user => {
      userByEmailMap.set(user.email, user);
    });
    console.log('');
    
    // ==================== 5. Update Manager References ====================
    log.progress('Updating manager references...');
    
    // Get manager and admin by email (matching Postman)
    const admin = userByEmailMap.get('admin@absentra.com');
    const manager = userByEmailMap.get('manager@absentra.com');
    const employee = userByEmailMap.get('employee@absentra.com');
    const employee2 = userByEmailMap.get('employee2@absentra.com');
    
    // Set manager references
    if (employee && manager) {
      await User.findByIdAndUpdate(employee._id, { managerId: manager._id });
      log.data(`EMP001 (${employee.name}) -> reports to -> ${manager.name}`);
    }
    
    if (employee2 && manager) {
      await User.findByIdAndUpdate(employee2._id, { managerId: manager._id });
      log.data(`EMP002 (${employee2.name}) -> reports to -> ${manager.name}`);
    }
    
    if (manager && admin) {
      await User.findByIdAndUpdate(manager._id, { managerId: admin._id });
      log.data(`MGR001 (${manager.name}) -> reports to -> ${admin.name}`);
    }
    
    log.success('Manager references updated');
    console.log('');
    
    // ==================== 6. Seed Leave Applications ====================
    log.progress('Seeding leave applications...');
    
    const managers = users.filter(u => u.role === USER_ROLES.MANAGER);
    const employees = users.filter(u => u.role === USER_ROLES.EMPLOYEE && u.isActive);
    
    const leavesData = generateLeaveApplications(employees, managers);
    if (leavesData.length > 0) {
      const leaves = await Leave.insertMany(leavesData);
      log.success(`Created ${leaves.length} leave applications`);
      
      // Display leave summary
      const pendingLeaves = leaves.filter(l => l.status === LEAVE_STATUS.PENDING).length;
      const approvedLeaves = leaves.filter(l => l.status === LEAVE_STATUS.APPROVED).length;
      const rejectedLeaves = leaves.filter(l => l.status === LEAVE_STATUS.REJECTED).length;
      const cancelledLeaves = leaves.filter(l => l.status === LEAVE_STATUS.CANCELLED).length;
      
      log.data(`Pending: ${pendingLeaves} | Approved: ${approvedLeaves} | Rejected: ${rejectedLeaves} | Cancelled: ${cancelledLeaves}`);
      
      // Store leave IDs for reference (matching Postman expectations)
      if (leaves[0]) {
        log.data(`Casual Leave ID (for approval): ${leaves[0]._id}`);
      }
      if (leaves[1]) {
        log.data(`Sick Leave ID (for rejection): ${leaves[1]._id}`);
      }
      if (leaves[2]) {
        log.data(`Earned Leave ID (for cancellation): ${leaves[2]._id}`);
      }
    } else {
      log.warning('No leave applications created - check user references');
    }
    console.log('');
    
    // ==================== 7. Final Summary ====================
    console.log('='.repeat(60));
    log.success('DATABASE SEEDED SUCCESSFULLY!');
    console.log('='.repeat(60));
    
    log.info('📊 Final Statistics:');
    console.log('');
    log.data(`🏢 Departments: Engineering, HR, Administration`);
    log.data(`👥 Total Users: ${users.length}`);
    log.data(`📋 Leave Policies: ${policies.length}`);
    log.data(`🎉 Holidays: ${holidays.length}`);
    log.data(`📝 Leave Applications: ${leavesData.length}`);
    console.log('');
    
    log.info('🔐 Test Login Credentials (Matching Postman):');
    console.log('');
    log.data('Admin:    admin@absentra.com / Admin@123');
    log.data('Manager:  manager@absentra.com / Manager@123');
    log.data('Employee: employee@absentra.com / Employee@123');
    log.data('Employee2: employee2@absentra.com / Employee@123');
    log.data('Test:     test@absentra.com / Employee@123');
    console.log('');
    
    log.info('📝 Postman Test Flow Compatibility:');
    console.log('');
    log.data('1. ✅ Register Admin - Will get "Email already exists" (seeded already)');
    log.data('2. ✅ Login Admin - Token will be generated');
    log.data('3. ✅ Register Manager - Will get "Email already exists" (seeded already)');
    log.data('4. ✅ Login Manager - Token will be generated');
    log.data('5. ✅ Register Employee - Will get "Email already exists" (seeded already)');
    log.data('6. ✅ Login Employee - Token will be generated');
    log.data('7. ✅ Apply for Leave - 3 pending leaves ready for testing');
    log.data('8. ✅ Manager Approval/Rejection flows ready');
    log.data('9. ✅ Reports and Admin endpoints ready');
    console.log('');
    
    log.info('🎯 Ready for Postman API Testing!');
    log.info('📌 Note: Some registration tests will show "duplicate email" because data is pre-seeded');
    console.log('');
    
  } catch (error) {
    log.error(`Seeding failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    log.info('Database connection closed');
  }
};

// Run seeder
if (require.main === module) {
  seedDatabase().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = seedDatabase;