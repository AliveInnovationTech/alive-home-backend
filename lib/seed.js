"use strict";
const { Sequelize } = require('sequelize');
const logger = require("../app/utils/logger");
require('dotenv').config();

const seedDatabase = async () => {
    try {
        logger.info("🌱 Starting database seeding...");

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
        const db = require("../app/models")(sequelize)
        const { User, Developer, Owner, Buyer, Realtor, Role } = db;

        const roles = [
            { name: 'ADMIN', description: 'Administrator with full access' },
            { name: 'SYSADMIN', description: 'Super administrator with all permissions' },
            { name: 'USER', description: 'Regular user' },
            { name: 'DEVELOPER', description: 'Property developer' },
            { name: 'HOMEOWNER', description: 'Property owner' },
            { name: 'BUYER', description: 'Property buyer' },
            { name: 'REALTOR', description: 'Real estate agent' }
        ];

        const createdRoles = {};
        for (const roleData of roles) {
            let role = await Role.findOne({ where: { name: roleData.name } });
            if (!role) {
                role = await Role.create(roleData);
                logger.info(`✅ Created role: ${roleData.name}`);
            } else {
                logger.info(`✅ Found existing role: ${roleData.name}`);
            }
            createdRoles[roleData.name] = role;
        }


        // Create admin user (or find existing)
        let adminUser = await User.findOne({ where: { email: "admin@alivehome.com" } });
        if (!adminUser) {
            adminUser = await User.create({
                email: "admin@alivehome.com",
                password: "admin123456",
                firstName: "Admin",
                lastName: "User",
                phoneNumber: "+2348012345678",
                roleId: createdRoles.ADMIN.roleId
            });
            logger.info("✅ Admin user created");
        } else {
            logger.info("✅ Found existing admin user");
        }

        // Create test users and their profiles
        const testUsers = [
            // Developer users
            {
                email: "john.developer@example.com",
                password: "password1",
                firstName: "John",
                lastName: "Developer",
                phoneNumber: "+2348012345679",
                roleId: createdRoles.DEVELOPER.roleId,
                profile: {
                    type: "developer",
                    data: {
                        companyName: "Luxury Homes Development Ltd",
                        cacRegNumber: "CAC123456789",
                        yearsInBusiness: 8,
                        projectsCompleted: 25,
                        websiteUrl: "https://luxuryhomes.dev",
                        officeAddress: "123 Victoria Island, Lagos, Nigeria",
                        companyLogoUrl: "https://res.cloudinary.com/demo/image/upload/v1/samples/landscapes/architecture-signs",
                        cloudinary_id: "demo_architecture",
                        isVerified: true
                    }
                }
            },
            {
                email: "sarah.developer@example.com",
                password: "password1",
                firstName: "Sarah",
                lastName: "Johnson",
                phoneNumber: "+2348012345680",
                roleId: createdRoles.DEVELOPER.roleId,
                profile: {
                    type: "developer",
                    data: {
                        companyName: "Greenfield Properties",
                        cacRegNumber: "CAC987654321",
                        yearsInBusiness: 5,
                        projectsCompleted: 15,
                        websiteUrl: "https://greenfieldproperties.ng",
                        officeAddress: "456 Lekki Phase 1, Lagos, Nigeria",
                        companyLogoUrl: "https://res.cloudinary.com/demo/image/upload/v1/samples/landscapes/architecture-signs",
                        cloudinary_id: "demo_architecture_2",
                        isVerified: false
                    }
                }
            },
            // HomeOwner users
            {
                email: "mike.homeowner@example.com",
                password: "password1",
                firstName: "Mike",
                lastName: "Williams",
                phoneNumber: "+2348012345681",
                roleId: createdRoles.HOMEOWNER.roleId,
                profile: {
                    type: "owner",
                    data: {
                        primaryResidence: "789 Banana Island, Lagos",
                        ownershipVerified: true,
                        preferredContactMethod: "EMAIL",
                        verificationDocsUrls: [
                            "https://res.cloudinary.com/demo/image/upload/v1/samples/documents/sample-pdf",
                            "https://res.cloudinary.com/demo/image/upload/v1/samples/documents/sample-pdf"
                        ]
                    }
                }
            },
            {
                email: "lisa.homeowner@example.com",
                password: "password1",
                firstName: "Lisa",
                lastName: "Brown",
                phoneNumber: "+2348012345682",
                roleId: createdRoles.HOMEOWNER.roleId,
                profile: {
                    type: "owner",
                    data: {
                        primaryResidence: "321 Ikoyi, Lagos",
                        ownershipVerified: false,
                        preferredContactMethod: "PHONE",
                        verificationDocsUrls: []
                    }
                }
            },
            // Buyer users
            {
                email: "david.buyer@example.com",
                password: "password1",
                firstName: "David",
                lastName: "Miller",
                phoneNumber: "+2348012345683",
                roleId: createdRoles.BUYER.roleId,
                profile: {
                    type: "buyer",
                    data: {
                        minimumBudget: 50000000,
                        maximumBudget: 150000000,
                        preApproved: true,
                        preApprovalAmount: 120000000,
                        preferredLocations: ["Lekki", "Victoria Island", "Ikoyi"],
                        propertyType: "HOUSE",
                        cloudinary_id: null
                    }
                }
            },
            {
                email: "emma.buyer@example.com",
                password: "password1",
                firstName: "Emma",
                lastName: "Davis",
                phoneNumber: "+2348012345684",
                roleId: createdRoles.BUYER.roleId,
                profile: {
                    type: "buyer",
                    data: {
                        minimumBudget: 30000000,
                        maximumBudget: 80000000,
                        preApproved: false,
                        preApprovalAmount: null,
                        preferredLocations: ["Surulere", "Yaba", "Gbagada"],
                        propertyType: "CONDO",
                        cloudinary_id: null
                    }
                }
            },
            // Realtor users
            {
                email: "james.realtor@example.com",
                password: "password1",
                firstName: "James",
                lastName: "Wilson",
                phoneNumber: "+2348012345685",
                roleId: createdRoles.REALTOR.roleId,
                profile: {
                    type: "realtor",
                    data: {
                        licenseNumber: "RELS001234",
                        brokerageName: "Elite Real Estate Agency",
                        yearsOfExperience: 12,
                        specialties: ["Luxury Homes", "Commercial Properties", "Investment Properties"],
                        certifications: ["NAR Certified", "Luxury Property Specialist"],
                        verificationDocsUrls: [
                            "https://res.cloudinary.com/demo/image/upload/v1/samples/documents/sample-pdf"
                        ],
                        isVerified: true
                    }
                }
            },
            {
                email: "anna.realtor@example.com",
                password: "password1",
                firstName: "Anna",
                lastName: "Taylor",
                phoneNumber: "+2348012345686",
                roleId: createdRoles.REALTOR.roleId,
                profile: {
                    type: "realtor",
                    data: {
                        licenseNumber: "RELS567890",
                        brokerageName: "Prime Properties Ltd",
                        yearsOfExperience: 7,
                        specialties: ["Residential Properties", "First-time Buyers"],
                        certifications: ["Residential Specialist"],
                        verificationDocsUrls: [],
                        isVerified: false
                    }
                }
            }
        ];


        for (const userData of testUsers) {
            let user = await User.findOne({ where: { email: userData.email } });
            if (!user) {
                user = await User.create({
                    email: userData.email,
                    password: userData.password,
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    phoneNumber: userData.phoneNumber,
                    roleId: userData.roleId
                });

                logger.info(`✅ Created user: ${userData.email}`);
                switch (userData.profile.type) {
                    case "developer":
                        await Developer.create({
                            userId: user.userId,
                            ...userData.profile.data
                        });
                        break;
                    case "owner":
                        await Owner.create({
                            userId: user.userId,
                            ...userData.profile.data
                        });
                        break;
                    case "buyer":
                        await Buyer.create({
                            userId: user.userId,
                            ...userData.profile.data
                        });
                        break;
                    case "realtor":
                        await Realtor.create({
                            userId: user.userId,
                            ...userData.profile.data
                        });
                        break;
                }

                logger.info(`✅ Created ${userData.profile.type} user: ${userData.email}`);
            } else {
                logger.info(`✅ Found existing user: ${userData.email}`);
            }
        }

        logger.info("🎉 Database seeding completed successfully!");

        // Log summary
        const userCount = await User.count();
        const developerCount = await Developer.count();
        const ownerCount = await Owner.count();
        const buyerCount = await Buyer.count();
        const realtorCount = await Realtor.count();

        logger.info("📊 Seeding Summary:");
        logger.info(`   - Total Users: ${userCount}`);
        logger.info(`   - Developers: ${developerCount}`);
        logger.info(`   - HomeOwners: ${ownerCount}`);
        logger.info(`   - Buyers: ${buyerCount}`);
        logger.info(`   - Realtors: ${realtorCount}`);

        // Close the connection
        await sequelize.close();

    } catch (error) {
        logger.error("❌ Database seeding failed:", error);
        process.exit(1);
    }
};

// Run seeding if this file is executed directly
if (require.main === module) {
    seedDatabase();
}

module.exports = seedDatabase;
