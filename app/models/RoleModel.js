"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class Role extends Model {
        static associate(models) {
            Role.hasMany(models.User, {
                foreignKey: "roleId",
                as: "users"
            });
            Role.belongsToMany(models.Permission, {
                through: models.RolePermission,
                foreignKey: "roleId",
                otherKey: "permissionId",
                as: "permissions",
                onDelete: "CASCADE",
                hooks: true
            });
        }
    }

    Role.init(
        {
            roleId: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
                field: "role_id"
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
            },
            description: {
                type: DataTypes.TEXT,
                field: "description"
            },
            isActive: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
                field: "is_active"
            },
            createdAt: {
                type: DataTypes.DATE,
                field: "created_at"
            },
            updatedAt: {
                type: DataTypes.DATE,
                field: "updated_at"
            },
            deletedAt: {
                type: DataTypes.DATE,
                field: "deleted_at"
            }
        },
        {
            sequelize,
            modelName: "Role",
            tableName: "roles",
            timestamps: true,
            paranoid: true,
            underscored: true
        }
    );

    return Role;
};
