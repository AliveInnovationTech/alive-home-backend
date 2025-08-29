"use strict";
const { Sequelize } = require('sequelize');
const logger = require("../app/utils/logger");
require('dotenv').config();

const migrateDatabase = async () => {
    try {
        logger.info("🔄 Starting database migration...");
        
        // Create sequelize instance for migration
        const sequelize = new Sequelize(
            process.env.DB_NAME,
            process.env.DB_USER,
            process.env.DB_PASSWORD,
            {
                host: process.env.DB_HOST,
                port: process.env.DB_PORT || 5432,
                dialect: process.env.DB_DIALECT,
                logging: false,
                dialectOptions: {
                    charset: 'utf8mb4',
                    ...(process.env.DB_SSL === 'true' && {
                        ssl: {
                            require: true,
                            rejectUnauthorized: false
                        }
                    })
                },
                define: {
                    timestamps: true,
                    paranoid: true,
                    underscored: true,
                    freezeTableName: true
                }
            }
        );

        // Test connection
        await sequelize.authenticate();
        logger.info("✅ Database connection established");

        // Load models
        const db = require('../app/models')(sequelize);
        sequelize.models = db;

        // Force sync all models (this will create tables and relationships)
        await sequelize.sync({ force: true });

        logger.info("✅ Database migration completed successfully");
        
        // Close the connection
        await sequelize.close();
        
    } catch (error) {
        logger.error("❌ Database migration failed:", error);
        process.exit(1);
    }
};

// Run migration if this file is executed directly
if (require.main === module) {
    migrateDatabase();
}

module.exports = migrateDatabase;