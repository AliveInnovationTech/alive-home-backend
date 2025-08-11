'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Permission extends Model {
        static associate(models) {
            Permission.belongsToMany(models.Role, {
                through: 'role_permissions',
                foreignKey: 'permissionId',
                otherKey: 'roleId',
                as: 'roles',
                onDelete: 'CASCADE'
            });
        }
    }

    Permission.init({
        permissionId: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false
        },
        name: {
            type: DataTypes.STRING,
            unique: {
                name: 'permissions_name_unique',
                msg: 'Permission name must be unique'
            },
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: 'Permission name is required'
                },
                is: {
                    args: /^[a-z_]+$/,
                    msg: 'Permission name must be lowercase with underscores'
                }
            }
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
            defaultValue: null
        },
        category: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'general',
            validate: {
                notEmpty: {
                    msg: 'Category is required'
                }
            }
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        }
    }, {
        sequelize,
        modelName: 'Permission',
        tableName: 'permissions',
        timestamps: true,
        underscored: true,
        paranoid: true,
        indexes: [
            { fields: ['name'], unique: true },
            { fields: ['category'] },
            { fields: ['is_active'] }
        ],
        defaultScope: {
            where: { isActive: true }
        },
        scopes: {
            inactive: {
                where: { isActive: false }
            },
            byCategory(category) {
                return { where: { category } };
            }
        }
    });

    Permission.beforeDestroy((permission) => {
        if (permission.name.startsWith('system_')) {
            throw new Error('System permissions cannot be deleted');
        }
    });

    return Permission;
};