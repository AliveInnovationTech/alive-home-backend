"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class Token extends Model {
        static associate(models) {
            Token.belongsTo(models.User, {
                foreignKey: "userId",
                as: "user"
            });
        }
    }

    Token.init({
        tokenId: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false
        },
        token: {
            type: DataTypes.STRING,
            allowNull: false
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'user_id'
            }
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: () => new Date(Date.now() + 20 * 60 * 1000)
        }
    }, {
        sequelize,
        modelName: 'Token',
        timestamps: false,
        tableName: 'Tokens',
    });

    Token.prototype.isExpired = function () {
        return new Date() > this.expiresAt;
    };

    Token.cleanupOldTokens = async function (days = 30) {
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        return await Token.destroy({
            where: {
                createdAt: {
                    [Op.lt]: cutoffDate
                }
            }
        });
    };

    return Token;
};

