const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('Email service not configured. Skipping email sending.');
    return null;
  }
  
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Send email
exports.sendEmail = async (options) => {
  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      console.log('Email not sent - transporter not configured');
      return false;
    }
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || `"Absentra" <${process.env.EMAIL_USER}>`,
      to: options.email,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html?.replace(/<[^>]*>/g, '')
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
};

// Send leave application confirmation
exports.sendLeaveApplicationEmail = async (employee, leave) => {
  const subject = `Leave Application Submitted - ${leave.leaveType.toUpperCase()}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4F46E5;">Leave Application Submitted</h2>
      <p>Dear ${employee.name},</p>
      <p>Your leave application has been submitted successfully and is pending approval.</p>
      
      <h3>Leave Details:</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Leave Type:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${leave.leaveType}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Start Date:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${new Date(leave.startDate).toLocaleDateString()}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>End Date:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${new Date(leave.endDate).toLocaleDateString()}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Number of Days:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${leave.numberOfDays}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Reason:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${leave.reason}</td>
        </tr>
      </table>
      
      <p>You will receive a notification once your leave is reviewed.</p>
      <p>Thank you,<br>Absentra Team</p>
    </div>
  `;
  
  return await exports.sendEmail({
    email: employee.email,
    subject,
    html
  });
};

// Send leave approval notification
exports.sendLeaveApprovalEmail = async (employee, leave, approver) => {
  const subject = `Leave Application Approved - ${leave.leaveType.toUpperCase()}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #10B981;">Leave Application Approved</h2>
      <p>Dear ${employee.name},</p>
      <p>Your leave application has been <strong style="color: #10B981;">APPROVED</strong> by ${approver.name}.</p>
      
      <h3>Leave Details:</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Leave Type:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${leave.leaveType}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Start Date:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${new Date(leave.startDate).toLocaleDateString()}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>End Date:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${new Date(leave.endDate).toLocaleDateString()}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Number of Days:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${leave.numberOfDays}</td>
        </tr>
      </table>
      
      ${leave.comments ? `
        <h3>Approver Comments:</h3>
        <p style="background: #f3f4f6; padding: 12px; border-radius: 5px;">${leave.comments}</p>
      ` : ''}
      
      <p>Enjoy your time off!</p>
      <p>Best regards,<br>Absentra Team</p>
    </div>
  `;
  
  return await exports.sendEmail({
    email: employee.name,
    subject,
    html
  });
};

// Send leave rejection notification
exports.sendLeaveRejectionEmail = async (employee, leave, approver) => {
  const subject = `Leave Application Update - ${leave.leaveType.toUpperCase()}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #EF4444;">Leave Application Status Update</h2>
      <p>Dear ${employee.name},</p>
      <p>Your leave application has been <strong style="color: #EF4444;">REJECTED</strong> by ${approver.name}.</p>
      
      <h3>Leave Details:</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Leave Type:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${leave.leaveType}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Start Date:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${new Date(leave.startDate).toLocaleDateString()}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>End Date:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${new Date(leave.endDate).toLocaleDateString()}</td>
        </tr>
      </table>
      
      <h3>Reason for Rejection:</h3>
      <p style="background: #fef2f2; padding: 12px; border-radius: 5px; color: #991b1b;">
        ${leave.comments || 'No specific reason provided'}
      </p>
      
      <p>Please contact your manager or HR for more information.</p>
      <p>Regards,<br>Absentra Team</p>
    </div>
  `;
  
  return await exports.sendEmail({
    email: employee.email,
    subject,
    html
  });
};

// Send pending leave notification to manager
exports.sendPendingLeaveNotification = async (manager, employee, leave) => {
  const subject = `Pending Leave Request - ${employee.name}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #F59E0B;">Pending Leave Request</h2>
      <p>Dear ${manager.name},</p>
      <p>${employee.name} has submitted a leave request that requires your approval.</p>
      
      <h3>Leave Details:</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Employee:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${employee.name} (${employee.employeeId})</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Leave Type:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${leave.leaveType}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Duration:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${new Date(leave.startDate).toLocaleDateString()} to ${new Date(leave.endDate).toLocaleDateString()}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Days:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${leave.numberOfDays}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Reason:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${leave.reason}</td>
        </tr>
      </table>
      
      <p>Please login to the Absentra system to review and respond to this request.</p>
      <p>Thank you,<br>Absentra System</p>
    </div>
  `;
  
  return await exports.sendEmail({
    email: manager.email,
    subject,
    html
  });
};

// Send welcome email to new employee
exports.sendWelcomeEmail = async (employee, password = null) => {
  const subject = 'Welcome to Absentra - Leave Management System';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4F46E5;">Welcome to Absentra!</h2>
      <p>Dear ${employee.name},</p>
      <p>Your account has been created in the Absentra Leave Management System.</p>
      
      <h3>Account Details:</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Employee ID:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${employee.employeeId}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Email:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${employee.email}</td>
        </tr>
        ${password ? `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Temporary Password:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;"><code>${password}</code></td>
        </tr>
        ` : ''}
      </table>
      
      <p>You can login at: <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}">${process.env.CLIENT_URL || 'http://localhost:3000'}</a></p>
      <p>Please change your password after first login.</p>
      <p>Best regards,<br>Absentra Team</p>
    </div>
  `;
  
  return await exports.sendEmail({
    email: employee.email,
    subject,
    html
  });
};

// Send password reset email
exports.sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
  const subject = 'Password Reset Request';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4F46E5;">Password Reset Request</h2>
      <p>Dear ${user.name},</p>
      <p>You requested to reset your password. Click the button below to reset it:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Reset Password
        </a>
      </div>
      
      <p>Or copy and paste this link into your browser:</p>
      <p style="background: #f3f4f6; padding: 12px; border-radius: 5px; word-break: break-all;">${resetUrl}</p>
      
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
      <p>Best regards,<br>Absentra Team</p>
    </div>
  `;
  
  return await exports.sendEmail({
    email: user.email,
    subject,
    html
  });
};