const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { validationResult } = require('express-validator');

// Load env variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const reportRoutes = require('./routes/reportRoutes');

// Import middleware
const { errorHandler, rateLimiter } = require('./middleware/errorMiddleware');

// Initialize app
const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global validation middleware - catches all validation errors
app.use((req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  next();
});

// Apply rate limiting to all API routes
app.use('/api', rateLimiter(100, 60000)); // 100 requests per minute

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Absentra API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Absentra API',
    version: '1.0.0',
    status: 'active',
    documentation: '/api/health'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot find ${req.originalUrl} on this server`
  });
});

// Global error handler
app.use(errorHandler);

module.exports = app;