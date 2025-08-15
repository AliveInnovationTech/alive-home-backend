'use strict';

const { Sequelize } = require('sequelize');
const logger = require('../app/utils/logger');
require('dotenv').config();

const requiredEnvVars = ['DB_NAME', 'DB_USER', 'DB_HOST', 'DB_DIALECT'];
requiredEnvVars.forEach(env => {
  if (!process.env[env]) {
    logger.error(`❌ Missing required environment variable: ${env}`);
    process.exit(1);
  }
});

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: process.env.DB_DIALECT,
    logging: process.env.NODE_ENV === 'development' ? 
      (msg) => logger.debug(msg) : false,
    dialectOptions: {
      charset: 'utf8mb4',
      ...(process.env.DB_SSL === 'true' && {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      })
    },
    pool: {
      max: parseInt(process.env.DB_POOL_MAX) || 20,
      min: parseInt(process.env.DB_POOL_MIN) || 3,
      acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 30000,
      idle: parseInt(process.env.DB_POOL_IDLE) || 10000
    },
    define: {
      timestamps: true,
      paranoid: true,
      underscored: true,
      freezeTableName: true
    },
    benchmark: process.env.NODE_ENV === 'development'
  }
);

const db = require('../app/models')(sequelize);

sequelize.models = db;

const initializeDatabase = async () => {
  try {
    await sequelize.authenticate();
    logger.info('✅ Database connection established');

    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: false });
      logger.info('🔄 Database schema synchronized (alter off)');
    } else if (process.env.DB_SYNC === 'true') {
      await sequelize.sync();
      logger.warn('⚠️ PRODUCTION SCHEMA SYNCHRONIZED (manual override)');
    }
  } catch (error) {
    logger.error('❌ DATABASE INITIALIZATION FAILED', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  initializeDatabase();
}

module.exports = sequelize;