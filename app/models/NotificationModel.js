"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class Notification extends Model {
        static associate(models) {
            Notification.belongsTo(models.User, {
                foreignKey: "recipientId",
                as: "recipient",
                onDelete: "CASCADE"
            });

            Notification.hasMany(models.Notification, {
                foreignKey: "parentNotificationId",
                as: "children"
            });
            Notification.belongsTo(models.Notification, {
                foreignKey: "parentNotificationId",
                as: "parent"
            });
        }
    }

    Notification.init(
        {
            notificationId: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true
            },
            recipientId: {
                type: DataTypes.UUID,
                allowNull: false
            },
            parentNotificationId: {
                type: DataTypes.UUID,
                allowNull: true
            },
            type: {
                type: DataTypes.ENUM("EMAIL", "PUSH"),
                allowNull: false
            },
            subject: {
                type: DataTypes.STRING,
                allowNull: true
            },
            content: {
                type: DataTypes.TEXT,
                allowNull: false
            },
            html: {
                type: DataTypes.TEXT,
                allowNull: true 
            },
            status: {
                type: DataTypes.ENUM("PENDING", "SENT", "FAILED"),
                defaultValue: "PENDING"
            }
        },
        {
            sequelize,
            modelName: "Notification",
            tableName: "notifications",
            timestamps: true,
            indexes: [
                { fields: ["recipient_id"] },
                { fields: ["status"] },
                { fields: ["type"] }
            ]
        }
    );

    return Notification;
};
