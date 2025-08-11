"use strict";

module.exports = (sequelize, DataTypes) => {
    const Notification = sequelize.define('Notification', {
        notificationId: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        recipientId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        type: {
            type: DataTypes.ENUM('EMAIL', 'PUSH'),
            allowNull: false
        },
        subject: {
            type: DataTypes.STRING
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        html: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('PENDING', 'SENT', 'FAILED'),
            defaultValue: 'PENDING'
        },
    }, { tableName: 'notifications', timestamps: true });

    Notification.associate = function(models) {
        Notification.belongsTo(models.User, {
            foreignKey: 'recipientId',
            as: 'recipient'
        });
        Notification.hasMany(models.Notification, {
            foreignKey: 'notificationId',
            as: 'notifications'
        });
    };

    return Notification;
};

