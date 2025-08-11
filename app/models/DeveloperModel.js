"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class Developer extends Model {
        static associate(models) {
            Developer.belongsTo(models.User, {
                foreignKey: 'userId',
                as: 'user'
            });
        }
    }

    Developer.init(
        {
            developerId: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true
            },
            userId: {
                type: DataTypes.UUID,
                allowNull: false,
                unique: {
                    name: 'developer_user_unique',
                    msg: 'User can have only one developer profile'
                },
                references: {
                    model: 'users',
                    key: 'user_id'
                },
                onDelete: 'CASCADE'
            },
            companyName: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true
            },
            cacRegNumber: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true
            },
            yearsInBusiness: {
                type: DataTypes.INTEGER,
                validate: {
                    min: 0
                }
            },
            projectsCompleted: {
                type: DataTypes.INTEGER,
                defaultValue: 0
            },
            websiteUrl: {
                type: DataTypes.STRING,
                validate: {
                    isUrl: {
                        msg: 'Invalid URL format'
                    }
                }
            },
            officeAddress: {
                type: DataTypes.TEXT,
                validate: {
                    notEmpty: {
                        msg: 'Office address is required'
                    }
                }
            },
            companyLogoUrl: {
                type: DataTypes.STRING,
                validate: {
                    isUrl: {
                        msg: 'Invalid URL format'
                    }
                }
            },
            cloudinary_id: {
                type: DataTypes.STRING,
                allowNull: false
            },
            isVerified: { 
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                allowNull: false
            },
        },
        {
            sequelize,
            modelName: "Developer",
            tableName: "developers",
            paranoid: true,
            indexes: [
                { fields: ["company_name"], unique: true },
                { fields: ["cac_reg_number"], unique: true }
            ]
        }
    );

    return Developer;
};

