"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class Owner extends Model {
        static associate(models) {
            Owner.belongsTo(models.User, {
                foreignKey: 'userId',
                as: 'user'
            });

        }
    }

    Owner.init(
        {
            ownerId: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true
            },
            userId: {
                type: DataTypes.UUID,
                allowNull: false,
                unique: {
                    name: 'homeowner_user_unique',
                    msg: 'User can have only one homeowner profile'
                },
                references: {
                    model: 'users',
                    key: 'user_id'
                },
                onDelete: 'CASCADE'
            },
           
            primaryResidence: {
                type: DataTypes.STRING
            },
            ownershipVerified: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            },
            preferredContactMethod: {
                type: DataTypes.ENUM('EMAIL', 'PHONE', 'TEXT'),
                defaultValue: 'EMAIL'
            },
            verificationDocsUrls: {
                type: DataTypes.ARRAY(DataTypes.TEXT),
                defaultValue: []
            }
        },
        {
            sequelize,
            modelName: "Owner",
            tableName: "owners",
            paranoid: true
        }
    );

    return Owner;
};