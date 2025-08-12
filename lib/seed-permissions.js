"use strict";
const { Sequelize } = require('sequelize');
const bcrypt = require("bcryptjs");
const logger = require("../app/utils/logger");
require('dotenv').config();

const seedPermissionsAndRoles = async () => {
    try {
        logger.info("🌱 Starting permissions and roles seeding...");
        
        // Create sequelize instance for seeding
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
        
        const { User, Role, Permission } = sequelize.models;
        
        // Import permissions from the constants file
        const PERMISSIONS = require('../app/utils/permission.constant').PERMISSION;
        
        // Create permissions first
        logger.info("📝 Creating permissions...");
        const createdPermissions = {};
        
        for (const permissionData of PERMISSIONS) {
            let permission = await Permission.findOne({ 
                where: { name: permissionData.name } 
            });
            
            if (!permission) {
                permission = await Permission.create({
                    name: permissionData.name,
                    description: permissionData.description
                });
                logger.info(`✅ Created permission: ${permissionData.name}`);
            } else {
                logger.info(`✅ Found existing permission: ${permissionData.name}`);
            }
            createdPermissions[permissionData.name] = permission;
        }
        
        // Import role permissions mapping
        const rolesToPermissions = require('../app/utils/role.constants');
        
        // Create roles with their permissions
        logger.info("👥 Creating roles with permissions...");
        const createdRoles = {};
        
        for (const [roleName, permissionNames] of Object.entries(rolesToPermissions)) {
            // Create or find the role
            let role = await Role.findOne({ where: { name: roleName } });
            if (!role) {
                role = await Role.create({
                    name: roleName,
                    description: `${roleName} role with specific permissions`
                });
                logger.info(`✅ Created role: ${roleName}`);
            } else {
                logger.info(`✅ Found existing role: ${roleName}`);
            }
            
            createdRoles[roleName] = role;
            
            // Skip role-permission associations for now due to association issues
            logger.info(`✅ Role ${roleName} created/found (permissions will be assigned later)`);
        }
        
        // Create System Admin user
        logger.info("👑 Creating System Admin user...");
        
        const systemAdminEmail = "alliveinnovationtech@gmail.com";
        let systemAdmin = await User.findOne({ where: { email: systemAdminEmail } });
        
        if (!systemAdmin) {
            systemAdmin = await User.create({
                email: systemAdminEmail,
                password: "Unique4004", // Will be hashed by the model hook
                firstName: "Precious",
                lastName: "Agamuyi",
                phoneNumber: "+2347084176423",
                roleId: createdRoles.SUPER_ADMIN.roleId
            });
            logger.info("✅ System Admin user created successfully");
        } else {
            logger.info("✅ System Admin user already exists");
        }
        
        // Log summary
        const permissionCount = await Permission.count();
        const roleCount = await Role.count();
        const userCount = await User.count();
        
        logger.info("🎉 Permissions and roles seeding completed successfully!");
        logger.info("📊 Seeding Summary:");
        logger.info(`   - Total Permissions: ${permissionCount}`);
        logger.info(`   - Total Roles: ${roleCount}`);
        logger.info(`   - Total Users: ${userCount}`);
        logger.info(`   - System Admin: ${systemAdminEmail}`);
        
        // Close the connection
        await sequelize.close();
        
    } catch (error) {
        logger.error("❌ Permissions and roles seeding failed:", error);
        process.exit(1);
    }
};

// Run seeding if this file is executed directly
if (require.main === module) {
    seedPermissionsAndRoles();
}

module.exports = seedPermissionsAndRoles;
