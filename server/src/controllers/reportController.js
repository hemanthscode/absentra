const Leave = require('../models/Leave');
const User = require('../models/User');
const Holiday = require('../models/Holiday');
const { LEAVE_STATUS, HTTP_STATUS } = require('../config/constants');

// @desc    Generate leave report for department
// @route   GET /api/reports/department
// @access  Private/Admin/Manager
exports.getDepartmentReport = async (req, res, next) => {
  try {
    const { department, startDate, endDate, format = 'json', page = 1, limit = 50 } = req.query;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Build query
    const query = {
      startDate: { $gte: start, $lte: end },
      status: LEAVE_STATUS.APPROVED
    };
    
    // Find users in department
    const users = await User.find({ 
      department, 
      isActive: true 
    }).select('_id name email employeeId designation');
    
    const userIds = users.map(u => u._id);
    query.employeeId = { $in: userIds };
    
    // ADDED: Pagination for leaves
    const leaves = await Leave.find(query)
      .populate('employeeId', 'name email employeeId designation')
      .sort({ startDate: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const totalLeaves = await Leave.countDocuments(query);
    
    // Group by employee
    const reportData = users.map(user => {
      const userLeaves = leaves.filter(l => l.employeeId._id.toString() === user._id.toString());
      const totalDays = userLeaves.reduce((sum, l) => sum + l.numberOfDays, 0);
      const leaveByType = {};
      
      userLeaves.forEach(leave => {
        leaveByType[leave.leaveType] = (leaveByType[leave.leaveType] || 0) + leave.numberOfDays;
      });
      
      return {
        employee: {
          id: user._id,
          name: user.name,
          email: user.email,
          employeeId: user.employeeId,
          designation: user.designation
        },
        totalLeaves: userLeaves.length,
        totalDays,
        leaveByType,
        leaves: userLeaves
      };
    });
    
    // Summary
    const summary = {
      department,
      period: { startDate, endDate },
      totalEmployees: users.length,
      totalLeavesTaken: totalLeaves,
      totalDaysTaken: leaves.reduce((sum, l) => sum + l.numberOfDays, 0),
      averageDaysPerEmployee: totalLeaves ? leaves.reduce((sum, l) => sum + l.numberOfDays, 0) / users.length : 0
    };
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        summary,
        details: reportData
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalLeaves,
        pages: Math.ceil(totalLeaves / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate employee-wise leave report
// @route   GET /api/reports/employee/:employeeId
// @access  Private/Admin/Manager
exports.getEmployeeReport = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const { year = new Date().getFullYear(), page = 1, limit = 50 } = req.query;
    
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    
    const user = await User.findById(employeeId).select('-password');
    
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Employee not found'
      });
    }
    
    // ADDED: Pagination for leaves
    const leaves = await Leave.find({
      employeeId,
      startDate: { $gte: startDate, $lte: endDate },
      status: LEAVE_STATUS.APPROVED
    })
    .sort({ startDate: 1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
    
    const totalLeaves = await Leave.countDocuments({
      employeeId,
      startDate: { $gte: startDate, $lte: endDate },
      status: LEAVE_STATUS.APPROVED
    });
    
    // Calculate monthly breakdown
    const monthlyBreakdown = {};
    for (let i = 1; i <= 12; i++) {
      monthlyBreakdown[i] = { count: 0, days: 0 };
    }
    
    leaves.forEach(leave => {
      const month = leave.startDate.getMonth() + 1;
      monthlyBreakdown[month].count += 1;
      monthlyBreakdown[month].days += leave.numberOfDays;
    });
    
    // Leave by type
    const leaveByType = {};
    leaves.forEach(leave => {
      leaveByType[leave.leaveType] = (leaveByType[leave.leaveType] || 0) + leave.numberOfDays;
    });
    
    const reportData = {
      employee: {
        id: user._id,
        name: user.name,
        email: user.email,
        employeeId: user.employeeId,
        department: user.department,
        designation: user.designation,
        joiningDate: user.joiningDate,
        leaveBalance: user.leaveBalance
      },
      year,
      summary: {
        totalLeavesTaken: totalLeaves,
        totalDaysTaken: leaves.reduce((sum, l) => sum + l.numberOfDays, 0),
        averageDaysPerLeave: leaves.length ? leaves.reduce((sum, l) => sum + l.numberOfDays, 0) / leaves.length : 0
      },
      leaveByType,
      monthlyBreakdown,
      leaves
    };
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: reportData,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalLeaves,
        pages: Math.ceil(totalLeaves / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate attendance summary
// @route   GET /api/reports/attendance-summary
// @access  Private/Admin
exports.getAttendanceSummary = async (req, res, next) => {
  try {
    const { month, year = new Date().getFullYear(), page = 1, limit = 50 } = req.query;
    const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    
    const startDate = new Date(year, targetMonth - 1, 1);
    const endDate = new Date(year, targetMonth, 0);
    
    // Get all active employees with pagination
    const employees = await User.find({ isActive: true })
      .select('_id name department designation')
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const totalEmployees = await User.countDocuments({ isActive: true });
    
    // Get approved leaves for the month
    const leaves = await Leave.find({
      employeeId: { $in: employees.map(e => e._id) },
      startDate: { $lte: endDate },
      endDate: { $gte: startDate },
      status: LEAVE_STATUS.APPROVED
    });
    
    // Get holidays in the month
    const holidays = await Holiday.find({
      date: { $gte: startDate, $lte: endDate },
      isActive: true
    });
    
    // Calculate working days (excluding weekends and holidays)
    const getWorkingDaysCount = (start, end, holidaysList) => {
      let count = 0;
      const current = new Date(start);
      const holidayDates = holidaysList.map(h => h.date.toDateString());
      
      while (current <= end) {
        const dayOfWeek = current.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayDates.includes(current.toDateString())) {
          count++;
        }
        current.setDate(current.getDate() + 1);
      }
      return count;
    };
    
    const totalWorkingDays = getWorkingDaysCount(startDate, endDate, holidays);
    
    // Employee-wise summary
    const employeeSummary = employees.map(employee => {
      const employeeLeaves = leaves.filter(l => l.employeeId.toString() === employee._id.toString());
      const totalLeaveDays = employeeLeaves.reduce((sum, l) => sum + l.numberOfDays, 0);
      const attendancePercentage = ((totalWorkingDays - totalLeaveDays) / totalWorkingDays * 100).toFixed(2);
      
      return {
        employee: {
          id: employee._id,
          name: employee.name,
          department: employee.department,
          designation: employee.designation
        },
        totalWorkingDays,
        leaveDays: totalLeaveDays,
        presentDays: totalWorkingDays - totalLeaveDays,
        attendancePercentage: Math.max(0, attendancePercentage)
      };
    });
    
    // Department-wise summary
    const departmentSummary = {};
    employeeSummary.forEach(item => {
      const dept = item.employee.department;
      if (!departmentSummary[dept]) {
        departmentSummary[dept] = {
          totalEmployees: 0,
          totalWorkingDays: 0,
          totalLeaveDays: 0,
          totalPresentDays: 0
        };
      }
      departmentSummary[dept].totalEmployees++;
      departmentSummary[dept].totalWorkingDays += item.totalWorkingDays;
      departmentSummary[dept].totalLeaveDays += item.leaveDays;
      departmentSummary[dept].totalPresentDays += item.presentDays;
    });
    
    Object.keys(departmentSummary).forEach(dept => {
      const summary = departmentSummary[dept];
      summary.averageAttendance = ((summary.totalPresentDays / summary.totalWorkingDays) * 100).toFixed(2);
    });
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        period: {
          month: targetMonth,
          year,
          startDate,
          endDate
        },
        totalWorkingDays,
        holidays: holidays.map(h => ({ name: h.name, date: h.date })),
        employeeSummary,
        departmentSummary
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalEmployees,
        pages: Math.ceil(totalEmployees / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export report as CSV
// @route   GET /api/reports/export-csv
// @access  Private/Admin
exports.exportReportCSV = async (req, res, next) => {
  try {
    const { type, startDate, endDate, department } = req.query;
    
    let data = [];
    let headers = [];
    
    if (type === 'leaves') {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      const query = {
        startDate: { $gte: start, $lte: end },
        status: LEAVE_STATUS.APPROVED
      };
      
      if (department) {
        const users = await User.find({ department }).select('_id');
        query.employeeId = { $in: users.map(u => u._id) };
      }
      
      const leaves = await Leave.find(query)
        .populate('employeeId', 'name employeeId department designation')
        .sort({ startDate: 1 });
      
      headers = ['Employee ID', 'Name', 'Department', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Reason'];
      data = leaves.map(leave => ({
        employeeId: leave.employeeId.employeeId,
        name: leave.employeeId.name,
        department: leave.employeeId.department,
        leaveType: leave.leaveType,
        startDate: leave.startDate.toISOString().split('T')[0],
        endDate: leave.endDate.toISOString().split('T')[0],
        days: leave.numberOfDays,
        reason: leave.reason
      }));
    } else if (type === 'employees') {
      const users = await User.find({ isActive: true })
        .select('employeeId name email department designation role joiningDate leaveBalance');
      
      headers = ['Employee ID', 'Name', 'Email', 'Department', 'Designation', 'Role', 'Joining Date', 'Casual Leave', 'Sick Leave', 'Earned Leave'];
      data = users.map(user => ({
        employeeId: user.employeeId,
        name: user.name,
        email: user.email,
        department: user.department,
        designation: user.designation,
        role: user.role,
        joiningDate: user.joiningDate.toISOString().split('T')[0],
        casualLeave: user.leaveBalance.casual,
        sickLeave: user.leaveBalance.sick,
        earnedLeave: user.leaveBalance.earned
      }));
    }
    
    // Convert to CSV
    const csvRows = [];
    csvRows.push(headers.join(','));
    
    for (const row of data) {
      const values = headers.map(header => {
        const key = header.toLowerCase().replace(/ /g, '');
        const value = row[key] || '';
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    }
    
    const csv = csvRows.join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=report_${type}_${Date.now()}.csv`);
    res.status(HTTP_STATUS.OK).send(csv);
  } catch (error) {
    next(error);
  }
};