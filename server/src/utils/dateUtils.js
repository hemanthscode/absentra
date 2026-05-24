const Holiday = require('../models/Holiday');

// Calculate working days between two dates (excluding weekends and holidays)
exports.calculateWorkingDays = async (startDate, endDate, isHalfDay = false, department = null, location = null) => {
  let workingDays = 0;
  const currentDate = new Date(startDate);
  const end = new Date(endDate);
  
  // Get holidays between dates
  const holidays = await Holiday.find({
    date: { $gte: startDate, $lte: endDate },
    isActive: true
  });
  
  const holidayDates = holidays.map(h => h.date.toDateString());
  
  while (currentDate <= end) {
    const dayOfWeek = currentDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = holidayDates.includes(currentDate.toDateString());
    
    if (!isWeekend && !isHoliday) {
      workingDays++;
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
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
  const currentDate = new Date(startDate);
  const end = new Date(endDate);
  const holidayDates = holidays.map(h => new Date(h).toDateString());
  
  while (currentDate <= end) {
    const dayOfWeek = currentDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = holidayDates.includes(currentDate.toDateString());
    
    if (!isWeekend && !isHoliday) {
      workingDays++;
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  if (isHalfDay) {
    workingDays = workingDays - 0.5;
  }
  
  return Math.max(0, workingDays);
};

// Validate leave dates - FIXED VERSION
exports.validateLeaveDates = (startDate, endDate, minDaysBeforeApply = 1) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Set start date to beginning of day for accurate comparison
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  
  // Check if dates are valid
  if (start > end) {
    return {
      isValid: false,
      message: 'End date must be after start date'
    };
  }
  
  // Check if start date is in the past
  if (start < today) {
    return {
      isValid: false,
      message: 'Start date cannot be in the past'
    };
  }
  
  // Calculate days difference between today and start date
  const timeDiff = start.getTime() - today.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
  
  // Check minimum days before apply
  // For minDaysBeforeApply = 1, tomorrow (daysDiff = 1) should be valid
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
  const start = new Date(startDate);
  const end = new Date(endDate);
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
    year: d.getFullYear(),
    month: d.getMonth() + 1
  };
};

// Check if a date is weekend
exports.isWeekend = (date) => {
  const dayOfWeek = new Date(date).getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
};

// Check if a date is holiday (async)
exports.isHoliday = async (date, department = null, location = null) => {
  const holiday = await Holiday.findOne({
    date: new Date(date),
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
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  let workingDays = 0;
  const currentDate = new Date(startDate);
  
  const holidays = await Holiday.find({
    date: { $gte: startDate, $lte: endDate },
    isActive: true
  });
  
  const holidayDates = holidays.map(h => h.date.toDateString());
  
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = holidayDates.includes(currentDate.toDateString());
    
    if (!isWeekend && !isHoliday) {
      workingDays++;
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return workingDays;
};