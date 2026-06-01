const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Holiday name is required'],
    trim: true
  },
  date: {
    type: Date,
    required: [true, 'Holiday date is required'],
    unique: true
  },
  day: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    required: false  // Changed to false - will be auto-set
  },
  type: {
    type: String,
    enum: ['national', 'regional', 'festival', 'company', 'other'],
    default: 'national'
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  isOptional: {
    type: Boolean,
    default: false
  },
  applicableToDepartments: [{
    type: String,
    trim: true
  }],
  applicableToLocations: [{
    type: String,
    trim: true
  }],
  year: {
    type: Number,
    required: false  // Changed to false - will be auto-set
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster queries
holidaySchema.index({ date: 1, year: 1 });
holidaySchema.index({ year: 1, type: 1 });

// Pre-save middleware to set day and year automatically
holidaySchema.pre('save', function(next) {
  // Set day of week
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  this.day = days[this.date.getDay()];
  
  // Set year
  this.year = this.date.getFullYear();
  
  next();
});

// Pre-validate middleware to ensure year and day are set before validation
holidaySchema.pre('validate', function(next) {
  if (this.date) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    this.day = days[this.date.getDay()];
    this.year = this.date.getFullYear();
  }
  next();
});

// Static method to get holidays for a specific year
holidaySchema.statics.getHolidaysByYear = function(year) {
  return this.find({ 
    year: year, 
    isActive: true 
  }).sort({ date: 1 });
};

// Static method to check if a date is a holiday
holidaySchema.statics.isHoliday = async function(date, department = null, location = null) {
  const query = { 
    date: new Date(date), 
    isActive: true 
  };
  
  const holiday = await this.findOne(query);
  
  if (!holiday) return false;
  
  // Check if holiday is applicable to department/location
  if (holiday.applicableToDepartments.length && department) {
    if (!holiday.applicableToDepartments.includes(department)) return false;
  }
  
  if (holiday.applicableToLocations.length && location) {
    if (!holiday.applicableToLocations.includes(location)) return false;
  }
  
  return holiday;
};

// Static method to get holidays between dates
holidaySchema.statics.getHolidaysBetween = function(startDate, endDate) {
  return this.find({
    date: { $gte: startDate, $lte: endDate },
    isActive: true
  }).sort({ date: 1 });
};

const Holiday = mongoose.model('Holiday', holidaySchema);

module.exports = Holiday;