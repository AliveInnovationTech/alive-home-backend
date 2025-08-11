"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class Role extends Model {
        static associate(models) {
            Role.belongsToMany(models.User, {
                through: "user_roles",
                foreignKey: "roleId",
                otherKey: "userId",
                as: "users"
            });
        }
    }

    Role.init(
        {
            roleId: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true
            },
            description: DataTypes.TEXT
        },
        {
            sequelize,
            modelName: "Role",
            tableName: "roles",
            timestamps: true,
            paranoid: true
        }
    );

    return Role;
};