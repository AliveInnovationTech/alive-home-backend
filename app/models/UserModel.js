"use strict";
const { Model } = require("sequelize");
const bcrypt = require("bcryptjs");
const { STATUS } = require("../utils/constants");

module.exports = (sequelize, DataTypes) => {
    class User extends Model {
        static associate(models) {
            User.belongsTo(models.Role, {
                foreignKey: "roleId",
                as: "role"
            });
            User.hasMany(models.Token, {
                foreignKey: "userId",
                as: "tokens",
                onDelete: "CASCADE"
            });

            User.hasOne(models.Realtor, {
                foreignKey: 'userId',
                as: 'realtor',
                onDelete: 'CASCADE',
                hooks: true
            });

            User.hasOne(models.Developer, {
                foreignKey: 'userId',
                as: 'developer',
                onDelete: 'CASCADE',
                hooks: true
            });

            User.hasOne(models.Owner, {
                foreignKey: 'userId',
                as: 'owner',
                onDelete: 'CASCADE',
                hooks: true
            });

            User.hasOne(models.Buyer, {
                foreignKey: 'userId',
                as: 'buyer',
                onDelete: 'CASCADE',
                hooks: true
            });

            User.hasMany(models.UserSubscription, {
                foreignKey: 'userId',
                as: 'subscriptions',
                onDelete: 'CASCADE'
            });

            User.hasMany(models.Transaction, {
                foreignKey: 'userId',
                as: 'transactions',
                onDelete: 'CASCADE'
            });

            User.hasMany(models.Payment, {
                foreignKey: 'createdBy',
                as: 'createdPayments',
                onDelete: 'SET NULL'
            });

            User.hasMany(models.Transaction, {
                foreignKey: 'commissionRecipientId',
                as: 'commissionTransactions',
                onDelete: 'SET NULL'
            });

            User.hasMany(models.UserBehavior, {
                foreignKey: 'userId',
                as: 'behaviors',
                onDelete: 'CASCADE'
            });

            User.hasMany(models.Recommendation, {
                foreignKey: 'userId',
                as: 'recommendations',
                onDelete: 'CASCADE'
            });
        }

        async validatePassword(password) {
            return bcrypt.compare(password, this.password);
        }
    }

    User.init(
        {
            userId: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false
            },
            roleId: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'roles',
                    key: 'role_id'
                }
            },
            email: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: {
                    name: 'users_email_unique',
                    msg: 'Email address already in use'
                },
                validate: {
                    isEmail: {
                        msg: 'Invalid email format'
                    }
                }
            },
            phoneNumber: {
                type: DataTypes.STRING,
                unique: {
                    name: 'users_phone_unique',
                    msg: 'Phone number already in use'
                },
                // validate: {
                //     is: /^\+[1-9]\d{1,14}$/
                // }
            },
            password: {
                type: DataTypes.STRING(64),
                allowNull: false,
                set(value) {
                    if (value && (value.length < 8 || value.length > 15)) {
                        throw new Error('Password must be 8-15 characters');
                    }
                    const hash = bcrypt.hashSync(value, 10);
                    this.setDataValue("password", hash);
                }
            },
            firstName: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    notEmpty: {
                        msg: 'First name is required'
                    }
                }
            },
            lastName: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    notEmpty: {
                        msg: 'Last name is required'
                    }
                }
            },
            profilePicture: {
                type: DataTypes.STRING,
                validate: {
                    isUrl: {
                        msg: 'Invalid URL format'
                    }
                },
                defaultValue: null
            },
            accountStatus: {
                type: DataTypes.ENUM(...Object.values(STATUS)),
                defaultValue: STATUS.PENDING,
                allowNull: false
            },
            isEmailVerified: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            },
            emailVerifiedAt: {
                type: DataTypes.DATE,
                defaultValue: null
            },
            lastLoginAt: {
                type: DataTypes.DATE,
                defaultValue: null
            },
            lastLoginIp: {
                type: DataTypes.STRING(45),
                validate: {
                    isIP: {
                        msg: 'Invalid IP address format'
                    }
                },
                defaultValue: null
            },
            cloudinary_id: {
                type: DataTypes.STRING,
                validate: {
                    isUrl: {
                        msg: 'Invalid URL format'
                    }
                },
                defaultValue: null
            },
            isDeveloperProfileFiled: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            },
            isRealtorProfileFiled: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            },
            isHomeownerProfileFiled: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            },
            isBuyerProfileFiled: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            },

        },
        {
            sequelize,
            modelName: "User",
            tableName: "users",
            timestamps: true,
            underscored: true,
            paranoid: true,
            indexes: [
                { fields: ["account_status"] },
                { fields: ["email"] },
                { fields: ["phone_number"] }
            ],
            defaultScope: {
                attributes: {
                    exclude: ['password']
                }
            },
            scopes: {
                withPassword: {
                    attributes: {
                        include: ['password']
                    }
                }
            }
        }
    );

    // // ✅ Business rule: require email or phone
    // User.beforeValidate((user) => {
    //     if (!user.phoneNumber && !user.email) {
    //         throw new Error('Either email or phone must be provided');
    //     }
    // });

    return User;
};
