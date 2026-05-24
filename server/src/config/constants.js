// User Roles
const USER_ROLES = {
  EMPLOYEE: 'employee',
  MANAGER: 'manager',
  ADMIN: 'admin'
};

// User Gender
const USER_GENDER = {
  MALE: 'male',
  FEMALE: 'female',
  OTHER: 'other'
};

// Leave Status
const LEAVE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled'
};

// Leave Types
const LEAVE_TYPES = {
  CASUAL: 'casual',
  SICK: 'sick',
  EARNED: 'earned',
  UNPAID: 'unpaid',
  MATERNITY: 'maternity',
  PATERNITY: 'paternity',
  BEREAVEMENT: 'bereavement',
  MARRIAGE: 'marriage'
};

// Gender-specific leave types
const GENDER_SPECIFIC_LEAVES = {
  [USER_GENDER.FEMALE]: [LEAVE_TYPES.MATERNITY],
  [USER_GENDER.MALE]: [LEAVE_TYPES.PATERNITY],
  [USER_GENDER.OTHER]: [] // No gender-specific leaves for other
};

// Default Leave Policies (in days per year)
const DEFAULT_LEAVE_POLICIES = {
  [LEAVE_TYPES.CASUAL]: 12,
  [LEAVE_TYPES.SICK]: 12,
  [LEAVE_TYPES.EARNED]: 15,
  [LEAVE_TYPES.UNPAID]: 0,
  [LEAVE_TYPES.MATERNITY]: 180,
  [LEAVE_TYPES.PATERNITY]: 15,
  [LEAVE_TYPES.BEREAVEMENT]: 5,
  [LEAVE_TYPES.MARRIAGE]: 5
};

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500
};

// Response Messages
const MESSAGES = {
  // Success messages
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  LEAVE_APPLIED: 'Leave application submitted successfully',
  LEAVE_APPROVED: 'Leave application approved',
  LEAVE_REJECTED: 'Leave application rejected',
  USER_CREATED: 'User created successfully',
  USER_UPDATED: 'User updated successfully',
  USER_DELETED: 'User deleted successfully',
  POLICY_UPDATED: 'Leave policy updated successfully',
  HOLIDAY_ADDED: 'Holiday added successfully',
  REPORT_GENERATED: 'Report generated successfully',

  // Error messages
  INVALID_CREDENTIALS: 'Invalid email or password',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'You do not have permission to perform this action',
  NOT_FOUND: 'Resource not found',
  DUPLICATE_EMAIL: 'Email already exists',
  INSUFFICIENT_BALANCE: 'Insufficient leave balance',
  DATE_CONFLICT: 'Leave dates conflict with existing application',
  INVALID_DATES: 'Invalid leave dates',
  LEAVE_NOT_FOUND: 'Leave application not found',
  USER_NOT_FOUND: 'User not found',
  POLICY_NOT_FOUND: 'Leave policy not found',
  HOLIDAY_NOT_FOUND: 'Holiday not found',
  GENDER_RESTRICTION: 'This leave type is not applicable for your gender'
};

module.exports = {
  USER_ROLES,
  USER_GENDER,
  LEAVE_STATUS,
  LEAVE_TYPES,
  GENDER_SPECIFIC_LEAVES,
  DEFAULT_LEAVE_POLICIES,
  HTTP_STATUS,
  MESSAGES
};