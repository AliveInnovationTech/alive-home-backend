"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class Realtor extends Model {
        static associate(models) {
            Realtor.belongsTo(models.User, {
                foreignKey: 'userId',
                as: 'user'
            });
        }
    }

    Realtor.init(
        {
            realtorId: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true
            },
            userId: {
                type: DataTypes.UUID,
                allowNull: false,
                unique: {
                    name: 'realtor_user_unique',
                    msg: 'User can have only one realtor profile'
                },
                references: {
                    model: 'users',
                    key: 'user_id'
                },
                onDelete: 'CASCADE'
            },
            licenseNumber: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true
            },
            brokerageName: {
                type: DataTypes.STRING,
                allowNull: false
            },
            yearsOfExperience: {
                type: DataTypes.INTEGER,
                validate: {
                    min: 0
                }
            },
            specialties: {
                type: DataTypes.ARRAY(DataTypes.STRING),
                defaultValue: []
            },
            certifications: {
                type: DataTypes.ARRAY(DataTypes.STRING),
                defaultValue: []
            },
            verificationDocsUrls: {
                type: DataTypes.ARRAY(DataTypes.TEXT),
                defaultValue: []
            },
            isVerified: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                allowNull: false
            },
            cloudinary_id: {
                type: DataTypes.STRING,
                validate: {
                    isUrl: {
                        msg: 'Invalid URL format'
                    }
                },
                defaultValue: null
            }
        },
        {
            sequelize,
            modelName: "Realtor",
            tableName: "realtors",
            paranoid: true,
            indexes: [
                { fields: ["license_number"], unique: true }
            ]
        }
    );

    return Realtor;
};