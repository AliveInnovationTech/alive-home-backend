"use strict";
const { Model } = require("sequelize");
const { PROPERTY_TYPES } = require("../utils/constants")
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
                type: DataTypes.ENUM(
                    PROPERTY_TYPES.DETACHED_HOUSE,
                    PROPERTY_TYPES.SEMI_DETACHED,
                    PROPERTY_TYPES.TERRACE_HOUSE,
                    PROPERTY_TYPES.DUPLEX,
                    PROPERTY_TYPES.BUNGALOW,
                    PROPERTY_TYPES.MANSION,
                    PROPERTY_TYPES.VILLA,
                    PROPERTY_TYPES.ESTATE_HOUSE,
                    PROPERTY_TYPES.TOWNHOUSE,
                    PROPERTY_TYPES.COMPOUND,
                    PROPERTY_TYPES.CHALET,
                    PROPERTY_TYPES.BOYS_QUARTERS,
                    PROPERTY_TYPES.HOUSE,
                    PROPERTY_TYPES.APARTMENT,
                    PROPERTY_TYPES.PENTHOUSE,
                    PROPERTY_TYPES.MINI_FLAT,
                    PROPERTY_TYPES.SELF_CONTAINED,
                    PROPERTY_TYPES.ROOM_AND_PARLOUR,
                    PROPERTY_TYPES.SERVICED_APARTMENT,
                    PROPERTY_TYPES.COMMERCIAL_OFFICE,
                    PROPERTY_TYPES.RETAIL_SHOP,
                    PROPERTY_TYPES.WAREHOUSE,
                    PROPERTY_TYPES.COMMERCIAL_PLAZA,
                    PROPERTY_TYPES.HOTEL,
                    PROPERTY_TYPES.LAND_RESIDENTIAL,
                    PROPERTY_TYPES.LAND_COMMERCIAL,
                    PROPERTY_TYPES.LAND_INDUSTRIAL,
                    PROPERTY_TYPES.LAND_AGRICULTURAL,
                    PROPERTY_TYPES.STUDENT_HOSTEL,
                    PROPERTY_TYPES.LAND,
                    PROPERTY_TYPES.COMMERCIAL,
                    PROPERTY_TYPES.CONDO,
                    PROPERTY_TYPES.CO_WORKING_SPACE,
                    PROPERTY_TYPES.MULTIFAMILY,
                    PROPERTY_TYPES.SINGLE_FAMILY
                ),
                validate: { isIn: [Object.values(PROPERTY_TYPES)] },
                defaultValue: PROPERTY_TYPES.APARTMENT,
                allowNull: false,
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
