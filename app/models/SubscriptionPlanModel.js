"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class SubscriptionPlan extends Model {
        static associate(models) {
            SubscriptionPlan.hasMany(models.UserSubscription, {
                foreignKey: 'planId',
                as: 'subscriptions',
                onDelete: 'RESTRICT'
            });
        }
    }

    SubscriptionPlan.init(
        {
            planId: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    notEmpty: {
                        msg: 'Plan name is required'
                    },
                    len: {
                        args: [2, 100],
                        msg: 'Plan name must be between 2 and 100 characters'
                    }
                }
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: false,
                validate: {
                    notEmpty: {
                        msg: 'Plan description is required'
                    }
                }
            },
            planType: {
                type: DataTypes.ENUM('FREEMIUM', 'BASIC', 'PREMIUM'),
                allowNull: false,
                defaultValue: 'FREEMIUM',
                validate: {
                    isIn: {
                        args: [['FREEMIUM', 'BASIC', 'PREMIUM']],
                        msg: 'Invalid plan type'
                    }
                }
            },
            price: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: false,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Price must be non-negative'
                    }
                }
            },
            currency: {
                type: DataTypes.STRING(3),
                allowNull: false,
                defaultValue: 'NGN',
                validate: {
                    isIn: {
                        args: [['NGN', 'EUR', 'GBP', 'CAD', 'AUD', 'USD']],
                        msg: 'Unsupported currency'
                    }
                }
            },
            billingCycle: {
                type: DataTypes.ENUM('MONTHLY', 'QUARTERLY', 'YEARLY'),
                allowNull: false,
                defaultValue: 'MONTHLY',
                validate: {
                    isIn: {
                        args: [['MONTHLY', 'QUARTERLY', 'YEARLY']],
                        msg: 'Invalid billing cycle'
                    }
                }
            },
            billingCycleMonths: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 1,
                validate: {
                    min: {
                        args: [1],
                        msg: 'Billing cycle months must be at least 1'
                    },
                    max: {
                        args: [12],
                        msg: 'Billing cycle months cannot exceed 12'
                    }
                }
            },
            trialPeriodDays: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Trial period must be non-negative'
                    },
                    max: {
                        args: [365],
                        msg: 'Trial period cannot exceed 365 days'
                    }
                }
            },
            maxListings: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Max listings must be non-negative'
                    }
                }
            },
            maxPhotosPerListing: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Max photos per listing must be non-negative'
                    }
                }
            },
            maxVirtualTours: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Max virtual tours must be non-negative'
                    }
                }
            },
            maxPremiumFeatures: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Max premium features must be non-negative'
                    }
                }
            },
            hasAnalytics: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            hasMarketInsights: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            hasPrioritySupport: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            hasAdvancedSearch: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            isActive: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true
            },
            isPopular: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            displayOrder: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Display order must be non-negative'
                    }
                }
            }
        },
        {
            sequelize,
            modelName: "SubscriptionPlan",
            tableName: "subscription_plans",
            timestamps: true,
            underscored: true,
            paranoid: true,
            indexes: [
                { fields: ["plan_type"] },
                { fields: ["is_active"] },
                { fields: ["display_order"] },
                { fields: ["price"] }
            ],
            validate: {
                async validatePlanTypePricing() {
                    if (this.planType === 'FREEMIUM' && this.price > 0) {
                        throw new Error('Freemium plans must have zero price');
                    }
                    if (this.planType !== 'FREEMIUM' && this.price <= 0) {
                        throw new Error('Paid plans must have positive price');
                    }
                }
            }
        }
    );

    return SubscriptionPlan;
};


