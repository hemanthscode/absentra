const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Leave = require('../models/Leave');
const LeavePolicy = require('../models/LeavePolicy');
const Holiday = require('../models/Holiday');
const { LEAVE_TYPES, LEAVE_STATUS, USER_ROLES, USER_GENDER } = require('../config/constants');

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB for seeding'))
  .catch(err => console.error('Connection error:', err));

// Helper function to generate random 10-digit phone number
const generatePhoneNumber = (index) => {
  return `987654${String(index + 1000).slice(-4)}`;
};

// Helper function to calculate days between dates
const calculateDays = (startDate, endDate, isHalfDay = false) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return isHalfDay ? diffDays - 0.5 : diffDays;
};

// Helper function to generate random date of birth (age between 22-60)
const generateDateOfBirth = () => {
  const year = 2024 - (Math.floor(Math.random() * 38) + 22); // Age between 22-60
  const month = Math.floor(Math.random() * 12);
  const day = Math.floor(Math.random() * 28) + 1;
  return new Date(year, month, day);
};

// Mock data
const departments = ['Engineering', 'HR', 'Sales', 'Marketing', 'Finance', 'Operations'];
const designations = ['Software Engineer', 'Senior Engineer', 'Team Lead', 'Manager', 'Director', 'HR Executive', 'Sales Executive'];

// Generate random date within range
const randomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Generate random employee ID
const generateEmployeeId = (index, prefix = 'EMP') => {
  return `${prefix}${String(index + 1000).slice(-4)}`;
};

// Users data with gender specification
const generateUsers = () => {
  const users = [];
  
  // Admin user (gender neutral)
  users.push({
    employeeId: 'ADMIN001',
    name: 'System Administrator',
    email: 'admin@absentra.com',
    password: 'Admin@123',
    role: USER_ROLES.ADMIN,
    gender: USER_GENDER.OTHER,
    department: 'IT',
    designation: 'System Administrator',
    managerId: null,
    joiningDate: new Date('2020-01-01'),
    dateOfBirth: new Date('1985-01-15'),
    contactNumber: '9876543210',
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
      paternity: 0,
      bereavement: 5,
      marriage: 5
    }
  });
  
  // Managers (5 managers) - Mix of male and female
  const managers = [];
  const managerGenders = [USER_GENDER.MALE, USER_GENDER.FEMALE, USER_GENDER.MALE, USER_GENDER.FEMALE, USER_GENDER.MALE];
  
  for (let i = 1; i <= 5; i++) {
    const gender = managerGenders[i - 1];
    const manager = {
      employeeId: generateEmployeeId(i, 'MGR'),
      name: `Manager ${i}`,
      email: `manager${i}@absentra.com`,
      password: 'Manager@123',
      role: USER_ROLES.MANAGER,
      gender: gender,
      department: departments[(i - 1) % departments.length],
      designation: designations[3 + (i % 2)],
      managerId: null,
      joiningDate: randomDate(new Date('2019-01-01'), new Date('2021-01-01')),
      dateOfBirth: generateDateOfBirth(),
      contactNumber: generatePhoneNumber(i + 100),
      address: {
        street: `${i} Manager Lane`,
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: `56000${i}`,
        country: 'India'
      },
      isActive: true,
      leaveBalance: {
        casual: 12,
        sick: 12,
        earned: 15,
        unpaid: 0,
        maternity: gender === USER_GENDER.FEMALE ? 180 : 0,
        paternity: gender === USER_GENDER.MALE ? 15 : 0,
        bereavement: 5,
        marriage: 5
      }
    };
    managers.push(manager);
    users.push(manager);
  }
  
  // Employees (30 employees) - Mix of genders
  const employeeGenders = [];
  for (let i = 1; i <= 30; i++) {
    // Create a mix: 12 female, 15 male, 3 other
    if (i <= 12) employeeGenders.push(USER_GENDER.FEMALE);
    else if (i <= 27) employeeGenders.push(USER_GENDER.MALE);
    else employeeGenders.push(USER_GENDER.OTHER);
  }
  
  for (let i = 1; i <= 30; i++) {
    const manager = managers[(i - 1) % managers.length];
    const gender = employeeGenders[i - 1];
    const joiningDate = randomDate(new Date('2022-01-01'), new Date('2024-01-01'));
    const yearsOfService = (new Date() - joiningDate) / (1000 * 60 * 60 * 24 * 365);
    
    // Different leave balances based on years of service and gender
    let leaveBalance = {
      casual: 12,
      sick: 12,
      earned: Math.min(15 + Math.floor(yearsOfService * 2), 30),
      unpaid: 0,
      maternity: gender === USER_GENDER.FEMALE ? 180 : 0,
      paternity: gender === USER_GENDER.MALE ? 15 : 0,
      bereavement: 5,
      marriage: 5
    };
    
    // Edge case: Employee 25 has reduced leave balance for testing insufficient balance
    if (i === 25) {
      leaveBalance.casual = 2;
      leaveBalance.sick = 1;
      leaveBalance.earned = 0;
    }
    
    // Edge case: Employee 26 has zero balance
    if (i === 26) {
      leaveBalance.casual = 0;
      leaveBalance.sick = 0;
    }
    
    const employee = {
      employeeId: generateEmployeeId(i, 'EMP'),
      name: `Employee ${i}`,
      email: `employee${i}@absentra.com`,
      password: 'Employee@123',
      role: USER_ROLES.EMPLOYEE,
      gender: gender,
      department: departments[(i - 1) % departments.length],
      designation: designations[(i - 1) % 3],
      managerId: manager ? manager._id || null : null,
      joiningDate: joiningDate,
      dateOfBirth: generateDateOfBirth(),
      contactNumber: generatePhoneNumber(i),
      address: {
        street: `${i} Employee Street`,
        city: ['Bangalore', 'Mumbai', 'Delhi', 'Chennai', 'Hyderabad'][(i - 1) % 5],
        state: ['Karnataka', 'Maharashtra', 'Delhi', 'Tamil Nadu', 'Telangana'][(i - 1) % 5],
        pincode: `5600${String(i).slice(-3)}`,
        country: 'India'
      },
      isActive: i !== 28, // Make employee 28 inactive for edge case
      leaveBalance: leaveBalance
    };
    users.push(employee);
  }
  
  return users;
};

// Generate leaves data with gender-specific leaves
const generateLeaves = (users) => {
  const leaves = [];
  const employees = users.filter(u => u.role === USER_ROLES.EMPLOYEE);
  const managers = users.filter(u => u.role === USER_ROLES.MANAGER);
  
  const leaveTypes = Object.values(LEAVE_TYPES);
  
  // Generate leaves for each employee
  employees.forEach((employee, idx) => {
    const manager = managers.find(m => m._id.toString() === employee.managerId?.toString()) || managers[0];
    const numLeaves = Math.floor(Math.random() * 8) + 2; // 2-10 leaves per employee
    
    for (let i = 0; i < numLeaves; i++) {
      // Random leave type - filter gender-specific leaves
      let availableLeaveTypes = leaveTypes.filter(type => {
        if (type === LEAVE_TYPES.MATERNITY && employee.gender !== USER_GENDER.FEMALE) return false;
        if (type === LEAVE_TYPES.PATERNITY && employee.gender !== USER_GENDER.MALE) return false;
        return true;
      });
      
      let leaveType = availableLeaveTypes[Math.floor(Math.random() * availableLeaveTypes.length)];
      
      // Edge cases: specific leave types for specific employees
      if (idx === 0) leaveType = LEAVE_TYPES.CASUAL;
      if (idx === 1) leaveType = LEAVE_TYPES.SICK;
      if (idx === 2) leaveType = LEAVE_TYPES.EARNED;
      if (idx === 3) leaveType = LEAVE_TYPES.UNPAID;
      
      // Gender-specific edge cases
      if (idx === 4 && employee.gender === USER_GENDER.FEMALE) leaveType = LEAVE_TYPES.MATERNITY;
      if (idx === 5 && employee.gender === USER_GENDER.MALE) leaveType = LEAVE_TYPES.PATERNITY;
      if (idx === 6) leaveType = LEAVE_TYPES.BEREAVEMENT;
      if (idx === 7) leaveType = LEAVE_TYPES.MARRIAGE;
      
      // Random dates - ensure dates are in 2024 and duration is positive
      const startDate = randomDate(new Date('2024-01-01'), new Date('2024-11-30'));
      const duration = Math.floor(Math.random() * 5) + 1; // 1-5 days
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + duration);
      
      // Ensure end date is not beyond 2024
      if (endDate.getFullYear() > 2024) {
        endDate.setFullYear(2024);
        endDate.setMonth(11);
        endDate.setDate(28);
      }
      
      const numberOfDays = calculateDays(startDate, endDate, false);
      
      // Random status with more approved than others
      let status;
      if (i < 5) status = LEAVE_STATUS.APPROVED;
      else if (i < 7) status = LEAVE_STATUS.PENDING;
      else if (i < 8) status = LEAVE_STATUS.REJECTED;
      else status = LEAVE_STATUS.CANCELLED;
      
      // Regular leave
      leaves.push({
        employeeId: employee._id,
        managerId: manager._id,
        leaveType: leaveType,
        startDate: startDate,
        endDate: endDate,
        numberOfDays: numberOfDays,
        reason: `${leaveType} leave application - ${status} - ${i + 1}`,
        status: status,
        appliedDate: randomDate(new Date('2024-01-01'), new Date()),
        reviewedBy: status !== LEAVE_STATUS.PENDING ? manager._id : null,
        reviewedDate: status !== LEAVE_STATUS.PENDING ? randomDate(new Date('2024-01-01'), new Date()) : null,
        comments: null,
        isHalfDay: false,
        halfDaySession: null,
        contactDuringLeave: employee.contactNumber,
        emergencyContact: generatePhoneNumber(999)
      });
    }
  });
  
  // Edge case: Half-day leave (for employee 15)
  const employee15 = employees.find(e => e.name === 'Employee 15');
  const manager15 = managers.find(m => m._id.toString() === employee15?.managerId?.toString());
  if (employee15 && manager15) {
    const startDate = new Date('2024-07-15');
    const endDate = new Date('2024-07-15');
    const numberOfDays = calculateDays(startDate, endDate, true);
    
    leaves.push({
      employeeId: employee15._id,
      managerId: manager15._id,
      leaveType: LEAVE_TYPES.CASUAL,
      startDate: startDate,
      endDate: endDate,
      numberOfDays: numberOfDays,
      reason: 'Half day leave for personal appointment',
      status: LEAVE_STATUS.PENDING,
      appliedDate: new Date('2024-07-10'),
      reviewedBy: null,
      reviewedDate: null,
      comments: null,
      isHalfDay: true,
      halfDaySession: 'first_half',
      contactDuringLeave: employee15.contactNumber,
      emergencyContact: generatePhoneNumber(999)
    });
  }
  
  // Edge case: Leave with comments (for employee 20)
  const employee20 = employees.find(e => e.name === 'Employee 20');
  const manager20 = managers.find(m => m._id.toString() === employee20?.managerId?.toString());
  if (employee20 && manager20) {
    const startDate = new Date('2024-08-10');
    const endDate = new Date('2024-08-15');
    const numberOfDays = calculateDays(startDate, endDate, false);
    
    leaves.push({
      employeeId: employee20._id,
      managerId: manager20._id,
      leaveType: LEAVE_TYPES.EARNED,
      startDate: startDate,
      endDate: endDate,
      numberOfDays: numberOfDays,
      reason: 'Annual vacation with family',
      status: LEAVE_STATUS.APPROVED,
      appliedDate: new Date('2024-07-20'),
      reviewedBy: manager20._id,
      reviewedDate: new Date('2024-07-25'),
      comments: 'Approved with comments: Please ensure work is handed over properly before leaving',
      isHalfDay: false,
      halfDaySession: null,
      contactDuringLeave: employee20.contactNumber,
      emergencyContact: generatePhoneNumber(998)
    });
  }
  
  // Edge case: Overlapping leaves (for employee 10)
  const employee10 = employees.find(e => e.name === 'Employee 10');
  const manager10 = managers.find(m => m._id.toString() === employee10?.managerId?.toString());
  if (employee10 && manager10) {
    const startDate1 = new Date('2024-09-10');
    const endDate1 = new Date('2024-09-15');
    const numberOfDays1 = calculateDays(startDate1, endDate1, false);
    
    const startDate2 = new Date('2024-09-12');
    const endDate2 = new Date('2024-09-18');
    const numberOfDays2 = calculateDays(startDate2, endDate2, false);
    
    // First leave
    leaves.push({
      employeeId: employee10._id,
      managerId: manager10._id,
      leaveType: LEAVE_TYPES.CASUAL,
      startDate: startDate1,
      endDate: endDate1,
      numberOfDays: numberOfDays1,
      reason: 'First leave - vacation',
      status: LEAVE_STATUS.APPROVED,
      appliedDate: new Date('2024-08-20'),
      reviewedBy: manager10._id,
      reviewedDate: new Date('2024-08-25'),
      comments: null,
      isHalfDay: false,
      halfDaySession: null,
      contactDuringLeave: employee10.contactNumber,
      emergencyContact: generatePhoneNumber(997)
    });
    
    // Second overlapping leave
    leaves.push({
      employeeId: employee10._id,
      managerId: manager10._id,
      leaveType: LEAVE_TYPES.SICK,
      startDate: startDate2,
      endDate: endDate2,
      numberOfDays: numberOfDays2,
      reason: 'Second leave - overlapping with first',
      status: LEAVE_STATUS.PENDING,
      appliedDate: new Date('2024-08-30'),
      reviewedBy: null,
      reviewedDate: null,
      comments: null,
      isHalfDay: false,
      halfDaySession: null,
      contactDuringLeave: employee10.contactNumber,
      emergencyContact: generatePhoneNumber(996)
    });
  }
  
  // Edge case: Leave with insufficient balance (for employee 25)
  const employee25 = employees.find(e => e.name === 'Employee 25');
  const manager25 = managers.find(m => m._id.toString() === employee25?.managerId?.toString());
  if (employee25 && manager25) {
    const startDate = new Date('2024-06-01');
    const endDate = new Date('2024-06-20');
    const numberOfDays = calculateDays(startDate, endDate, false);
    
    leaves.push({
      employeeId: employee25._id,
      managerId: manager25._id,
      leaveType: LEAVE_TYPES.CASUAL,
      startDate: startDate,
      endDate: endDate,
      numberOfDays: numberOfDays,
      reason: 'Long vacation - testing insufficient balance scenario',
      status: LEAVE_STATUS.PENDING,
      appliedDate: new Date('2024-05-15'),
      reviewedBy: null,
      reviewedDate: null,
      comments: null,
      isHalfDay: false,
      halfDaySession: null,
      contactDuringLeave: employee25.contactNumber,
      emergencyContact: generatePhoneNumber(995)
    });
  }
  
  // Edge case: Past leave date (for employee 26)
  const employee26 = employees.find(e => e.name === 'Employee 26');
  const manager26 = managers.find(m => m._id.toString() === employee26?.managerId?.toString());
  if (employee26 && manager26) {
    const startDate = new Date('2023-12-25');
    const endDate = new Date('2023-12-28');
    const numberOfDays = calculateDays(startDate, endDate, false);
    
    leaves.push({
      employeeId: employee26._id,
      managerId: manager26._id,
      leaveType: LEAVE_TYPES.SICK,
      startDate: startDate,
      endDate: endDate,
      numberOfDays: numberOfDays,
      reason: 'Past leave - should be rejected by validation',
      status: LEAVE_STATUS.PENDING,
      appliedDate: new Date('2023-12-20'),
      reviewedBy: null,
      reviewedDate: null,
      comments: null,
      isHalfDay: false,
      halfDaySession: null,
      contactDuringLeave: employee26.contactNumber,
      emergencyContact: generatePhoneNumber(994)
    });
  }
  
  // Edge case: Maternity leave (for female employee 4)
  const femaleEmployee = employees.find(e => e.gender === USER_GENDER.FEMALE && e.name !== 'Employee 25');
  const managerFE = managers.find(m => m._id.toString() === femaleEmployee?.managerId?.toString());
  if (femaleEmployee && managerFE) {
    const startDate = new Date('2024-03-01');
    const endDate = new Date('2024-08-28');
    const numberOfDays = calculateDays(startDate, endDate, false);
    
    leaves.push({
      employeeId: femaleEmployee._id,
      managerId: managerFE._id,
      leaveType: LEAVE_TYPES.MATERNITY,
      startDate: startDate,
      endDate: endDate,
      numberOfDays: numberOfDays,
      reason: 'Maternity leave',
      status: LEAVE_STATUS.APPROVED,
      appliedDate: new Date('2024-01-15'),
      reviewedBy: managerFE._id,
      reviewedDate: new Date('2024-01-20'),
      comments: 'Approved. Wishing you a healthy pregnancy.',
      isHalfDay: false,
      halfDaySession: null,
      contactDuringLeave: femaleEmployee.contactNumber,
      emergencyContact: generatePhoneNumber(993)
    });
  }
  
  // Edge case: Paternity leave (for male employee 5)
  const maleEmployee = employees.find(e => e.gender === USER_GENDER.MALE && e.name !== 'Employee 26');
  const managerMA = managers.find(m => m._id.toString() === maleEmployee?.managerId?.toString());
  if (maleEmployee && managerMA) {
    const startDate = new Date('2024-04-10');
    const endDate = new Date('2024-04-24');
    const numberOfDays = calculateDays(startDate, endDate, false);
    
    leaves.push({
      employeeId: maleEmployee._id,
      managerId: managerMA._id,
      leaveType: LEAVE_TYPES.PATERNITY,
      startDate: startDate,
      endDate: endDate,
      numberOfDays: numberOfDays,
      reason: 'Paternity leave for newborn',
      status: LEAVE_STATUS.APPROVED,
      appliedDate: new Date('2024-03-01'),
      reviewedBy: managerMA._id,
      reviewedDate: new Date('2024-03-05'),
      comments: 'Congratulations!',
      isHalfDay: false,
      halfDaySession: null,
      contactDuringLeave: maleEmployee.contactNumber,
      emergencyContact: generatePhoneNumber(992)
    });
  }
  
  // Edge case: Bereavement leave (for employee 6)
  const employee6 = employees.find(e => e.name === 'Employee 6');
  const manager6 = managers.find(m => m._id.toString() === employee6?.managerId?.toString());
  if (employee6 && manager6) {
    const startDate = new Date('2024-05-20');
    const endDate = new Date('2024-05-24');
    const numberOfDays = calculateDays(startDate, endDate, false);
    
    leaves.push({
      employeeId: employee6._id,
      managerId: manager6._id,
      leaveType: LEAVE_TYPES.BEREAVEMENT,
      startDate: startDate,
      endDate: endDate,
      numberOfDays: numberOfDays,
      reason: 'Family bereavement',
      status: LEAVE_STATUS.APPROVED,
      appliedDate: new Date('2024-05-18'),
      reviewedBy: manager6._id,
      reviewedDate: new Date('2024-05-19'),
      comments: 'Sorry for your loss. Take the time you need.',
      isHalfDay: false,
      halfDaySession: null,
      contactDuringLeave: employee6.contactNumber,
      emergencyContact: generatePhoneNumber(991)
    });
  }
  
  // Edge case: Marriage leave (for employee 7)
  const employee7 = employees.find(e => e.name === 'Employee 7');
  const manager7 = managers.find(m => m._id.toString() === employee7?.managerId?.toString());
  if (employee7 && manager7) {
    const startDate = new Date('2024-11-15');
    const endDate = new Date('2024-11-19');
    const numberOfDays = calculateDays(startDate, endDate, false);
    
    leaves.push({
      employeeId: employee7._id,
      managerId: manager7._id,
      leaveType: LEAVE_TYPES.MARRIAGE,
      startDate: startDate,
      endDate: endDate,
      numberOfDays: numberOfDays,
      reason: 'Marriage leave',
      status: LEAVE_STATUS.PENDING,
      appliedDate: new Date('2024-10-01'),
      reviewedBy: null,
      reviewedDate: null,
      comments: null,
      isHalfDay: false,
      halfDaySession: null,
      contactDuringLeave: employee7.contactNumber,
      emergencyContact: generatePhoneNumber(990)
    });
  }
  
  // Edge case: Cancelled leave (for employee 8)
  const employee8 = employees.find(e => e.name === 'Employee 8');
  const manager8 = managers.find(m => m._id.toString() === employee8?.managerId?.toString());
  if (employee8 && manager8) {
    const startDate = new Date('2024-09-05');
    const endDate = new Date('2024-09-07');
    const numberOfDays = calculateDays(startDate, endDate, false);
    
    leaves.push({
      employeeId: employee8._id,
      managerId: manager8._id,
      leaveType: LEAVE_TYPES.CASUAL,
      startDate: startDate,
      endDate: endDate,
      numberOfDays: numberOfDays,
      reason: 'Planned leave - cancelled later',
      status: LEAVE_STATUS.CANCELLED,
      appliedDate: new Date('2024-08-01'),
      reviewedBy: null,
      reviewedDate: null,
      comments: 'Cancelled due to change in plans',
      isHalfDay: false,
      halfDaySession: null,
      contactDuringLeave: employee8.contactNumber,
      emergencyContact: generatePhoneNumber(989)
    });
  }
  
  // Edge case: Rejected leave (for employee 9)
  const employee9 = employees.find(e => e.name === 'Employee 9');
  const manager9 = managers.find(m => m._id.toString() === employee9?.managerId?.toString());
  if (employee9 && manager9) {
    const startDate = new Date('2024-10-20');
    const endDate = new Date('2024-10-25');
    const numberOfDays = calculateDays(startDate, endDate, false);
    
    leaves.push({
      employeeId: employee9._id,
      managerId: manager9._id,
      leaveType: LEAVE_TYPES.EARNED,
      startDate: startDate,
      endDate: endDate,
      numberOfDays: numberOfDays,
      reason: 'Vacation request',
      status: LEAVE_STATUS.REJECTED,
      appliedDate: new Date('2024-09-15'),
      reviewedBy: manager9._id,
      reviewedDate: new Date('2024-09-20'),
      comments: 'Rejected due to project deadlines during this period',
      isHalfDay: false,
      halfDaySession: null,
      contactDuringLeave: employee9.contactNumber,
      emergencyContact: generatePhoneNumber(988)
    });
  }
  
  return leaves;
};

// Generate leave policies
const generatePolicies = () => {
  const policies = [];
  
  const policyConfigs = [
    {
      policyName: 'Casual Leave Policy',
      leaveType: LEAVE_TYPES.CASUAL,
      totalDaysPerYear: 12,
      maxConsecutiveDays: 3,
      minDaysBeforeApply: 1,
      requiresApproval: true,
      carryForward: false,
      isActive: true,
      description: 'Casual leaves for personal reasons',
      applicableToGenders: [USER_GENDER.MALE, USER_GENDER.FEMALE, USER_GENDER.OTHER]
    },
    {
      policyName: 'Sick Leave Policy',
      leaveType: LEAVE_TYPES.SICK,
      totalDaysPerYear: 12,
      maxConsecutiveDays: 5,
      minDaysBeforeApply: 0,
      requiresApproval: true,
      carryForward: false,
      isActive: true,
      description: 'Medical leave with doctor certificate required for more than 3 days',
      documentsRequired: true,
      documentsList: ['Medical Certificate'],
      applicableToGenders: [USER_GENDER.MALE, USER_GENDER.FEMALE, USER_GENDER.OTHER]
    },
    {
      policyName: 'Earned Leave Policy',
      leaveType: LEAVE_TYPES.EARNED,
      totalDaysPerYear: 15,
      maxConsecutiveDays: 30,
      minDaysBeforeApply: 7,
      requiresApproval: true,
      carryForward: true,
      maxCarryForwardDays: 15,
      isActive: true,
      description: 'Annual earned leave',
      applicableToGenders: [USER_GENDER.MALE, USER_GENDER.FEMALE, USER_GENDER.OTHER]
    },
    {
      policyName: 'Unpaid Leave Policy',
      leaveType: LEAVE_TYPES.UNPAID,
      totalDaysPerYear: 0,
      maxConsecutiveDays: 30,
      minDaysBeforeApply: 7,
      requiresApproval: true,
      carryForward: false,
      isActive: true,
      description: 'Leave without pay',
      applicableToGenders: [USER_GENDER.MALE, USER_GENDER.FEMALE, USER_GENDER.OTHER]
    },
    {
      policyName: 'Maternity Leave Policy',
      leaveType: LEAVE_TYPES.MATERNITY,
      totalDaysPerYear: 180,
      maxConsecutiveDays: 180,
      minDaysBeforeApply: 30,
      requiresApproval: true,
      carryForward: false,
      isActive: true,
      description: 'Maternity leave for female employees',
      applicableToDesignations: ['Software Engineer', 'Senior Engineer', 'Team Lead', 'Manager'],
      applicableToGenders: [USER_GENDER.FEMALE],
      documentsRequired: true,
      documentsList: ['Medical Certificate', 'Expected Delivery Date']
    },
    {
      policyName: 'Paternity Leave Policy',
      leaveType: LEAVE_TYPES.PATERNITY,
      totalDaysPerYear: 15,
      maxConsecutiveDays: 15,
      minDaysBeforeApply: 15,
      requiresApproval: true,
      carryForward: false,
      isActive: true,
      description: 'Paternity leave for male employees',
      applicableToGenders: [USER_GENDER.MALE]
    },
    {
      policyName: 'Bereavement Leave Policy',
      leaveType: LEAVE_TYPES.BEREAVEMENT,
      totalDaysPerYear: 5,
      maxConsecutiveDays: 5,
      minDaysBeforeApply: 0,
      requiresApproval: true,
      carryForward: false,
      isActive: true,
      description: 'Leave in case of family member demise',
      applicableToGenders: [USER_GENDER.MALE, USER_GENDER.FEMALE, USER_GENDER.OTHER]
    },
    {
      policyName: 'Marriage Leave Policy',
      leaveType: LEAVE_TYPES.MARRIAGE,
      totalDaysPerYear: 5,
      maxConsecutiveDays: 5,
      minDaysBeforeApply: 7,
      requiresApproval: true,
      carryForward: false,
      isActive: true,
      description: 'Leave for marriage',
      applicableToGenders: [USER_GENDER.MALE, USER_GENDER.FEMALE, USER_GENDER.OTHER]
    }
  ];
  
  policyConfigs.forEach(config => {
    policies.push(config);
  });
  
  return policies;
};

// Generate holidays
const generateHolidays = () => {
  const holidays = [];
  
  const holidayList = [
    { name: 'Republic Day', date: '2024-01-26', type: 'national', description: 'Republic Day of India' },
    { name: 'Maha Shivaratri', date: '2024-03-08', type: 'festival', description: 'Maha Shivaratri' },
    { name: 'Holi', date: '2024-03-25', type: 'festival', description: 'Festival of Colors' },
    { name: 'Good Friday', date: '2024-03-29', type: 'national', description: 'Good Friday' },
    { name: 'Ugadi', date: '2024-04-09', type: 'regional', description: 'Telugu New Year', applicableToLocations: ['Bangalore', 'Hyderabad'] },
    { name: 'Ramzan Id', date: '2024-04-11', type: 'festival', description: 'Eid-ul-Fitr' },
    { name: 'Labour Day', date: '2024-05-01', type: 'national', description: 'International Workers Day' },
    { name: 'Independence Day', date: '2024-08-15', type: 'national', description: 'Independence Day' },
    { name: 'Ganesh Chaturthi', date: '2024-09-07', type: 'festival', description: 'Ganesh Chaturthi' },
    { name: 'Gandhi Jayanti', date: '2024-10-02', type: 'national', description: 'Mahatma Gandhi Birthday' },
    { name: 'Dussehra', date: '2024-10-12', type: 'festival', description: 'Vijaya Dashami' },
    { name: 'Diwali', date: '2024-10-31', type: 'festival', description: 'Festival of Lights' },
    { name: 'Christmas', date: '2024-12-25', type: 'national', description: 'Christmas Day' }
  ];
  
  holidayList.forEach((holiday) => {
    holidays.push({
      name: holiday.name,
      date: new Date(holiday.date),
      day: new Date(holiday.date).toLocaleDateString('en-US', { weekday: 'long' }),
      type: holiday.type,
      description: holiday.description,
      isOptional: false,
      applicableToLocations: holiday.applicableToLocations || [],
      year: 2024,
      isActive: true
    });
  });
  
  return holidays;
};

// Main seed function
const seedDatabase = async () => {
  try {
    console.log('🧹 Clearing existing data...');
    await User.deleteMany({});
    await Leave.deleteMany({});
    await LeavePolicy.deleteMany({});
    await Holiday.deleteMany({});
    
    console.log('📝 Creating leave policies...');
    const policies = await LeavePolicy.insertMany(generatePolicies());
    console.log(`✅ Created ${policies.length} leave policies`);
    
    console.log('👥 Creating users...');
    const users = generateUsers();
    
    // Save users and capture their ObjectIds
    const savedUsers = [];
    for (const user of users) {
      const savedUser = await User.create(user);
      savedUsers.push(savedUser);
    }
    
    // Update manager references with actual ObjectIds
    for (let i = 0; i < savedUsers.length; i++) {
      if (savedUsers[i].role === USER_ROLES.EMPLOYEE) {
        const manager = savedUsers.find(u => u.role === USER_ROLES.MANAGER && u.department === savedUsers[i].department);
        if (manager) {
          savedUsers[i].managerId = manager._id;
          await savedUsers[i].save();
        }
      }
    }
    
    console.log(`✅ Created ${savedUsers.length} users`);
    console.log(`   - Admin: ${savedUsers.filter(u => u.role === USER_ROLES.ADMIN).length}`);
    console.log(`   - Managers: ${savedUsers.filter(u => u.role === USER_ROLES.MANAGER).length}`);
    console.log(`   - Employees: ${savedUsers.filter(u => u.role === USER_ROLES.EMPLOYEE).length}`);
    console.log(`   - Gender Distribution:`);
    console.log(`     • Male: ${savedUsers.filter(u => u.gender === USER_GENDER.MALE).length}`);
    console.log(`     • Female: ${savedUsers.filter(u => u.gender === USER_GENDER.FEMALE).length}`);
    console.log(`     • Other: ${savedUsers.filter(u => u.gender === USER_GENDER.OTHER).length}`);
    
    console.log('📅 Creating leaves...');
    const leaves = generateLeaves(savedUsers);
    const savedLeaves = await Leave.insertMany(leaves);
    console.log(`✅ Created ${savedLeaves.length} leaves`);
    
    console.log('🎉 Creating holidays...');
    const holidays = await Holiday.insertMany(generateHolidays());
    console.log(`✅ Created ${holidays.length} holidays`);
    
    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Users: ${savedUsers.length}`);
    console.log(`     • Admin: ${savedUsers.filter(u => u.role === USER_ROLES.ADMIN).length}`);
    console.log(`     • Managers: ${savedUsers.filter(u => u.role === USER_ROLES.MANAGER).length}`);
    console.log(`     • Employees: ${savedUsers.filter(u => u.role === USER_ROLES.EMPLOYEE).length}`);
    console.log(`   - Leave Policies: ${policies.length}`);
    console.log(`   - Leave Applications: ${savedLeaves.length}`);
    console.log(`     • Pending: ${savedLeaves.filter(l => l.status === LEAVE_STATUS.PENDING).length}`);
    console.log(`     • Approved: ${savedLeaves.filter(l => l.status === LEAVE_STATUS.APPROVED).length}`);
    console.log(`     • Rejected: ${savedLeaves.filter(l => l.status === LEAVE_STATUS.REJECTED).length}`);
    console.log(`     • Cancelled: ${savedLeaves.filter(l => l.status === LEAVE_STATUS.CANCELLED).length}`);
    console.log(`   - Holidays: ${holidays.length}`);
    
    console.log('\n🔑 Test Credentials:');
    console.log('   ┌─────────────────────────────────────────────────────────────┐');
    console.log('   │ Admin:    admin@absentra.com            / Admin@123        │');
    console.log('   │ Manager:  manager1@absentra.com         / Manager@123      │');
    console.log('   │ Employee: employee1@absentra.com        / Employee@123     │');
    console.log('   │ Female Employee: employee4@absentra.com / Employee@123     │');
    console.log('   │ Male Employee: employee5@absentra.com   / Employee@123     │');
    console.log('   │ (Employee 25 has low leave balance)                        │');
    console.log('   └─────────────────────────────────────────────────────────────┘');
    
    console.log('\n📝 Edge Cases Included:');
    console.log('   ✅ Gender-specific leaves: Maternity (female only), Paternity (male only)');
    console.log('   ✅ Employee 25 - Insufficient leave balance (20 days requested, 2 available)');
    console.log('   ✅ Employee 26 - Past leave date (2023)');
    console.log('   ✅ Employee 10 - Overlapping leaves (Sep 10-15 and Sep 12-18)');
    console.log('   ✅ Employee 15 - Half-day leave (July 15, first half)');
    console.log('   ✅ Employee 20 - Leave with comments');
    console.log('   ✅ Employee 28 - Inactive user');
    console.log('   ✅ Female Employee - Maternity leave (180 days)');
    console.log('   ✅ Male Employee - Paternity leave');
    console.log('   ✅ Employee 6 - Bereavement leave');
    console.log('   ✅ Employee 7 - Marriage leave');
    console.log('   ✅ Employee 8 - Cancelled leave');
    console.log('   ✅ Employee 9 - Rejected leave');
    console.log('   ✅ All leave types covered');
    console.log('   ✅ All statuses (Pending/Approved/Rejected/Cancelled)');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    if (error.errors) {
      console.error('Validation Errors:');
      Object.keys(error.errors).forEach(key => {
        console.error(`   - ${key}: ${error.errors[key].message}`);
      });
    }
    process.exit(1);
  }
};

// Run seed
seedDatabase();