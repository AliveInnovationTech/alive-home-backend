"use strict";
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class RolePermission extends Model {
        static associate() { }
    }

    RolePermission.init({
        rolePermissionId: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        roleId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        permissionId: {
            type: DataTypes.UUID,
            allowNull: false
        }
    }, {
        sequelize,
        modelName: 'RolePermission',
        tableName: 'role_permissions',
        timestamps: true,
        paranoid: true,
        indexes: [
            { unique: true, fields: ['role_id', 'permission_id'] }
        ]
    });

    return RolePermission;
};
