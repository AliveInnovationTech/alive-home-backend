"use strict";
const { Sequelize } = require("sequelize");
const logger = require("../app/utils/logger");
const PERMISSIONS = require("../app/utils/permission.constant").PERMISSION;
const rolesToPermissions = require("../app/utils/role.constants");
require("dotenv").config();

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
                    charset: "utf8mb4",
                    ...(process.env.DB_SSL === "true" && {
                        ssl: {
                            require: true,
                            rejectUnauthorized: false,
                        },
                    }),
                },
                define: {
                    timestamps: true,
                    paranoid: true,
                    underscored: true,
                    freezeTableName: true,
                },
            }
        );

        // Test connection
        await sequelize.authenticate();
        logger.info("✅ Database connection established");

        // Load models
        const db = require("../app/models")(sequelize);

        const { User, Role, Permission } = db;

        // Create permissions first
        logger.info("📝 Creating permissions...");
        const createdPermissions = {};

        for (const permissionData of PERMISSIONS) {
            let permission = await Permission.findOne({
                where: { name: permissionData.name },
            });

            if (!permission) {
                permission = await Permission.create({
                    name: permissionData.name,
                    description: permissionData.description,
                    category: permissionData.category,
                });
                logger.info(`✅ Created permission: ${permissionData.name}`);
            } else {
                logger.info(`✅ Found existing permission: ${permissionData.name}`);
            }
            createdPermissions[permissionData.name] = permission;
        }

        // Create roles with their permissions
        logger.info("👥 Creating roles with permissions...");
        const createdRoles = {};

        for (const roleName of Object.keys(rolesToPermissions)) {
            let role = await Role.findOne({ where: { name: roleName } });
            if (!role) {
                role = await Role.create({
                    name: roleName,
                    description: `${roleName} role with specific permissions`,
                });
                logger.info(`✅ Created role: ${roleName}`);
            } else {
                logger.info(`✅ Found existing role: ${roleName}`);
            }

            createdRoles[roleName] = role;
            logger.info(
                `✅ Role ${roleName} created/found (permissions will be assigned later)`
            );
        }

        // Create System Admin user
        logger.info("👑 Creating System Admin user...");

        const systemAdminEmail =
            process.env.SYSTEM_ADMIN_EMAIL || "alliveinnovationtech@gmail.com";
        const systemAdminPassword =
            process.env.SYSTEM_ADMIN_PASSWORD || "Unique4004";

        let systemAdmin = await User.findOne({ where: { email: "alliveinnovationtech@gmail.com" } });

        if (!systemAdmin) {
            // Ensure SYSADMIN role exists
            if (!createdRoles.SYSADMIN) {
                throw new Error(
                    "❌ SYSADMIN role not found. Please check role.constants definition."
                );
            }

            systemAdmin = await User.create({
                email: systemAdminEmail,
                password: systemAdminPassword,
                firstName: "Precious",
                lastName: "Agamuyi",
                phoneNumber: "+2347084176423",
                roleId: createdRoles.SYSADMIN.roleId,
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
