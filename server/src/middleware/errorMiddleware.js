const { HTTP_STATUS } = require('../config/constants');

// Error handler middleware
exports.errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging
  console.error('Error:', err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource not found with id of ${err.value}`;
    error = {
      statusCode: HTTP_STATUS.NOT_FOUND,
      message: message
    };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    const message = `${field} already exists`;
    error = {
      statusCode: HTTP_STATUS.CONFLICT,
      message: message
    };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      message: message
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = {
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      message: 'Invalid token'
    };
  }

  if (err.name === 'TokenExpiredError') {
    error = {
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      message: 'Token expired'
    };
  }

  // Send response
  res.status(error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: error.message || 'Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

// 404 Not found middleware
exports.notFound = (req, res, next) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    message: `Cannot find ${req.originalUrl} on this server`
  });
};

// Async handler to avoid try-catch blocks
exports.asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Request logger middleware (for development)
exports.requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
};

// Rate limiting middleware (basic implementation)
exports.rateLimiter = (maxRequests = 100, windowMs = 60000) => {
  const requests = new Map();
  
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!requests.has(ip)) {
      requests.set(ip, []);
    }
    
    const timestamps = requests.get(ip);
    const windowStart = now - windowMs;
    
    // Filter out old timestamps
    const validTimestamps = timestamps.filter(timestamp => timestamp > windowStart);
    
    if (validTimestamps.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later'
      });
    }
    
    validTimestamps.push(now);
    requests.set(ip, validTimestamps);
    next();
  };
};

// Validation error formatter
exports.formatValidationErrors = (errors) => {
  const formattedErrors = {};
  
  errors.array().forEach(error => {
    if (formattedErrors[error.param]) {
      formattedErrors[error.param].push(error.msg);
    } else {
      formattedErrors[error.param] = [error.msg];
    }
  });
  
  return formattedErrors;
};

// CORS error handler
exports.corsErrorHandler = (err, req, res, next) => {
  if (err.name === 'CorsError') {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: 'CORS not allowed'
    });
  }
  next(err);
};