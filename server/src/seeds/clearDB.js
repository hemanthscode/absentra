/**
 * Database Clearing Script
 * Usage: npm run clear:db
 * 
 * This script will:
 * - Clear all collections
 * - Drop all indexes
 * - Reset sequences (if any)
 * - Confirm before deletion
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const readline = require('readline');

// Load environment variables
dotenv.config();

// Import models
const User = require('../models/User');
const Leave = require('../models/Leave');
const LeavePolicy = require('../models/LeavePolicy');
const Holiday = require('../models/Holiday');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ️ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  progress: (msg) => console.log(`${colors.cyan}🔄 ${msg}${colors.reset}`)
};

// Create readline interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askConfirmation = (question) => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
};

// Get database stats before clearing
const getDatabaseStats = async () => {
  const stats = {};
  
  const models = [
    { name: 'Users', model: User },
    { name: 'Leaves', model: Leave },
    { name: 'LeavePolicies', model: LeavePolicy },
    { name: 'Holidays', model: Holiday }
  ];
  
  for (const { name, model } of models) {
    try {
      const count = await model.countDocuments();
      stats[name] = count;
    } catch (error) {
      stats[name] = 0;
    }
  }
  
  return stats;
};

// Clear all collections (remove documents but keep collections)
const clearAllCollections = async () => {
  const models = [
    { name: 'User', model: User },
    { name: 'Leave', model: Leave },
    { name: 'LeavePolicy', model: LeavePolicy },
    { name: 'Holiday', model: Holiday }
  ];
  
  for (const { name, model } of models) {
    try {
      const result = await model.deleteMany({});
      log.success(`Cleared ${name} collection: ${result.deletedCount} documents removed`);
    } catch (error) {
      log.error(`Failed to clear ${name}: ${error.message}`);
    }
  }
};

// Reset indexes (recreate default indexes - safely)
const resetIndexes = async () => {
  log.progress('Resetting database indexes...');
  
  const models = [
    { name: 'User', model: User },
    { name: 'Leave', model: Leave },
    { name: 'LeavePolicy', model: LeavePolicy },
    { name: 'Holiday', model: Holiday }
  ];
  
  for (const { name, model } of models) {
    try {
      // Drop all existing indexes first (except _id)
      await model.collection.dropIndexes();
      log.success(`Dropped existing indexes for ${name}`);
      
      // Recreate indexes by calling ensureIndexes
      await model.init();
      log.success(`Recreated indexes for ${name}`);
    } catch (error) {
      // If error is about no indexes to drop, that's fine
      if (error.code !== 27) {
        log.warning(`Index sync for ${name}: ${error.message}`);
      } else {
        // Just create indexes if none exist
        await model.init();
        log.success(`Created indexes for ${name}`);
      }
    }
  }
};

// Main clear function
const clearDatabase = async (options = {}) => {
  const { skipConfirmation = false } = options;
  
  console.log('\n' + '='.repeat(60));
  log.warning('DATABASE CLEARING UTILITY');
  console.log('='.repeat(60) + '\n');
  
  // Get current stats
  log.info('Current database statistics:');
  const beforeStats = await getDatabaseStats();
  console.table(beforeStats);
  
  console.log('\n' + '-'.repeat(60) + '\n');
  
  // Confirmation prompt
  if (!skipConfirmation) {
    log.warning('⚠️  WARNING: This action will permanently delete all data! ⚠️');
    log.warning('This includes users, leaves, policies, holidays, and all related data.\n');
    
    const confirmClear = await askConfirmation('Are you sure you want to clear the database? (yes/no): ');
    
    if (!confirmClear) {
      log.info('Database clearing cancelled.');
      rl.close();
      process.exit(0);
    }
  }
  
  try {
    // Connect to MongoDB
    log.progress('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    log.success('Connected to MongoDB');
    
    // Clear all collections
    log.progress('Clearing all collections...');
    await clearAllCollections();
    
    // Reset indexes
    await resetIndexes();
    
    // Verify clearing
    log.progress('Verifying database clearing...');
    const afterStats = await getDatabaseStats();
    
    console.log('\n' + '-'.repeat(60));
    log.success('DATABASE CLEARED SUCCESSFULLY!');
    console.log('-'.repeat(60));
    
    log.info('Statistics after clearing:');
    console.table(afterStats);
    
    // Close connection
    await mongoose.connection.close();
    log.success('Database connection closed');
    
    rl.close();
    process.exit(0);
  } catch (error) {
    log.error(`Database clearing failed: ${error.message}`);
    console.error(error);
    
    try {
      await mongoose.connection.close();
    } catch (err) {
      // Ignore
    }
    
    rl.close();
    process.exit(1);
  }
};

// Parse command line arguments
const parseArgs = () => {
  const args = process.argv.slice(2);
  return {
    skipConfirmation: args.includes('--force') || args.includes('-f')
  };
};

// Run if called directly
if (require.main === module) {
  const options = parseArgs();
  clearDatabase(options);
}

module.exports = clearDatabase;