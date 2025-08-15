"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class Buyer extends Model {
        static associate(models) {
            Buyer.belongsTo(models.User, {
                foreignKey: 'userId',
                as: 'user'
            });
        }
    }

    Buyer.init(
        {
            buyerId: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true
            },
            userId: {
                type: DataTypes.UUID,
                allowNull: false,
                unique: {
                    name: 'buyer_user_unique',
                    msg: 'User can have only one buyer profile'
                },
                references: {
                    model: 'users',
                    key: 'user_id'
                },
                onDelete: 'CASCADE'
            },
            minimumBudget: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: false
            },
            maximumBudget: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: false
            },
            preApproved: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            },
            preApprovalAmount: {
                type: DataTypes.DECIMAL(12, 2)
            },
            preferredLocations: {
                type: DataTypes.ARRAY(DataTypes.STRING),
                defaultValue: []
            },
            propertyType: {
                type: DataTypes.ENUM('HOUSE', 'CONDO', 'TOWNHOUSE', 'MULTIFAMILY'),
                defaultValue: 'HOUSE'
            },
        },
        {
            sequelize,
            modelName: "Buyer",
            tableName: "buyers",
            paranoid: true
        }
    );

    return Buyer;
};
