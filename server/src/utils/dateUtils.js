const Holiday = require('../models/Holiday');

// Helper to normalize date to start of day in UTC
const normalizeDate = (date) => {
  const d = new Date(date);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0));
};

// Calculate working days between two dates (excluding weekends and holidays)
exports.calculateWorkingDays = async (startDate, endDate, isHalfDay = false, department = null, location = null) => {
  let workingDays = 0;
  const currentDate = normalizeDate(startDate);
  const end = normalizeDate(endDate);
  
  // Get holidays between dates
  const holidays = await Holiday.find({
    date: { $gte: currentDate, $lte: end },
    isActive: true
  });
  
  const holidayDates = holidays.map(h => h.date.toISOString().split('T')[0]);
  
  while (currentDate <= end) {
    const dayOfWeek = currentDate.getUTCDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const dateStr = currentDate.toISOString().split('T')[0];
    const isHoliday = holidayDates.includes(dateStr);
    
    if (!isWeekend && !isHoliday) {
      workingDays++;
    }
    
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }
  
  // Adjust for half day
  if (isHalfDay) {
    workingDays = workingDays - 0.5;
  }
  
  return Math.max(0, workingDays);
};

// Calculate working days synchronously (without DB call)
exports.calculateWorkingDaysSync = (startDate, endDate, holidays = [], isHalfDay = false) => {
  let workingDays = 0;
  const currentDate = normalizeDate(startDate);
  const end = normalizeDate(endDate);
  const holidayDates = holidays.map(h => normalizeDate(h).toISOString().split('T')[0]);
  
  while (currentDate <= end) {
    const dayOfWeek = currentDate.getUTCDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const dateStr = currentDate.toISOString().split('T')[0];
    const isHoliday = holidayDates.includes(dateStr);
    
    if (!isWeekend && !isHoliday) {
      workingDays++;
    }
    
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }
  
  if (isHalfDay) {
    workingDays = workingDays - 0.5;
  }
  
  return Math.max(0, workingDays);
};

// Validate leave dates - FIXED with proper UTC handling
exports.validateLeaveDates = (startDate, endDate, minDaysBeforeApply = 1) => {
  // Get current date in UTC (start of day)
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  
  // Normalize input dates to UTC start of day
  const startUTC = normalizeDate(startDate);
  const endUTC = normalizeDate(endDate);
  
  // Check if dates are valid
  if (startUTC > endUTC) {
    return {
      isValid: false,
      message: 'End date must be after start date'
    };
  }
  
  // Check if start date is in the past (compare as UTC dates)
  if (startUTC < todayUTC) {
    return {
      isValid: false,
      message: 'Start date cannot be in the past'
    };
  }
  
  // Calculate days difference
  const timeDiff = startUTC.getTime() - todayUTC.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
  
  // Check minimum days before apply
  if (minDaysBeforeApply > 0 && daysDiff < minDaysBeforeApply) {
    return {
      isValid: false,
      message: `Leave must be applied at least ${minDaysBeforeApply} day(s) in advance. Current advance notice: ${daysDiff} day(s)`
    };
  }
  
  return {
    isValid: true,
    message: 'Dates are valid'
  };
};

// Get number of days between dates
exports.getDaysDifference = (startDate, endDate) => {
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // Inclusive of both dates
};

// Format date to YYYY-MM-DD
exports.formatDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Get month name
exports.getMonthName = (monthNumber) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthNumber - 1];
};

// Get year and month from date
exports.getYearMonth = (date) => {
  const d = new Date(date);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1
  };
};

// Check if a date is weekend
exports.isWeekend = (date) => {
  const dayOfWeek = new Date(date).getUTCDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
};

// Check if a date is holiday (async)
exports.isHoliday = async (date, department = null, location = null) => {
  const normalizedDate = normalizeDate(date);
  const holiday = await Holiday.findOne({
    date: { $gte: normalizedDate, $lt: new Date(normalizedDate.getTime() + 86400000) },
    isActive: true
  });
  
  if (!holiday) return false;
  
  // Check department/location applicability
  if (holiday.applicableToDepartments.length && department) {
    if (!holiday.applicableToDepartments.includes(department)) return false;
  }
  
  if (holiday.applicableToLocations.length && location) {
    if (!holiday.applicableToLocations.includes(location)) return false;
  }
  
  return true;
};

// Get working days in a month
exports.getWorkingDaysInMonth = async (year, month, department = null, location = null) => {
  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59));
  
  let workingDays = 0;
  const currentDate = new Date(startDate);
  
  const holidays = await Holiday.find({
    date: { $gte: startDate, $lte: endDate },
    isActive: true
  });
  
  const holidayDates = holidays.map(h => h.date.toISOString().split('T')[0]);
  
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getUTCDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const dateStr = currentDate.toISOString().split('T')[0];
    const isHoliday = holidayDates.includes(dateStr);
    
    if (!isWeekend && !isHoliday) {
      workingDays++;
    }
    
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }
  
  return workingDays;
};