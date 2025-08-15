"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class UserSubscription extends Model {
        static associate(models) {
            UserSubscription.belongsTo(models.User, {
                foreignKey: 'userId',
                as: 'user'
            });

            UserSubscription.belongsTo(models.SubscriptionPlan, {
                foreignKey: 'planId',
                as: 'plan'
            });
        }
    }

    UserSubscription.init(
        {
            subscriptionId: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false
            },
            userId: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'user_id'
                },
                onDelete: 'CASCADE'
            },
            planId: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'subscription_plans',
                    key: 'plan_id'
                },
                onDelete: 'RESTRICT'
            },
            status: {
                type: DataTypes.ENUM('ACTIVE', 'CANCELLED', 'EXPIRED', 'PENDING', 'SUSPENDED'),
                allowNull: false,
                defaultValue: 'PENDING',
                validate: {
                    isIn: {
                        args: [['ACTIVE', 'CANCELLED', 'EXPIRED', 'PENDING', 'SUSPENDED']],
                        msg: 'Invalid subscription status'
                    }
                }
            },
            startDate: {
                type: DataTypes.DATE,
                allowNull: false,
                validate: {
                    isDate: {
                        msg: 'Invalid start date format'
                    }
                }
            },
            endDate: {
                type: DataTypes.DATE,
                allowNull: false,
                validate: {
                    isDate: {
                        msg: 'Invalid end date format'
                    }
                }
            },
            nextBillingDate: {
                type: DataTypes.DATE,
                allowNull: true,
                validate: {
                    isDate: {
                        msg: 'Invalid next billing date format'
                    }
                }
            },
            lastBillingDate: {
                type: DataTypes.DATE,
                allowNull: true,
                validate: {
                    isDate: {
                        msg: 'Invalid last billing date format'
                    }
                }
            },
            totalPaid: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: false,
                defaultValue: 0.00,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Total paid must be non-negative'
                    }
                }
            },
            lastPaymentAmount: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: true,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Last payment amount must be non-negative'
                    }
                }
            },
            paymentMethod: {
                type: DataTypes.STRING,
                allowNull: true,
                validate: {
                    len: {
                        args: [0, 100],
                        msg: 'Payment method must be less than 100 characters'
                    }
                }
            },
            isTrialActive: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            trialStartDate: {
                type: DataTypes.DATE,
                allowNull: true,
                validate: {
                    isDate: {
                        msg: 'Invalid trial start date format'
                    }
                }
            },
            trialEndDate: {
                type: DataTypes.DATE,
                allowNull: true,
                validate: {
                    isDate: {
                        msg: 'Invalid trial end date format'
                    }
                }
            },
            currentListings: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Current listings must be non-negative'
                    }
                }
            },
            currentPhotos: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Current photos must be non-negative'
                    }
                }
            },
            currentVirtualTours: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Current virtual tours must be non-negative'
                    }
                }
            },
            autoRenew: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true
            },
            cancellationReason: {
                type: DataTypes.TEXT,
                allowNull: true,
                validate: {
                    len: {
                        args: [0, 1000],
                        msg: 'Cancellation reason must be less than 1000 characters'
                    }
                }
            },
            cancelledAt: {
                type: DataTypes.DATE,
                allowNull: true,
                validate: {
                    isDate: {
                        msg: 'Invalid cancellation date format'
                    }
                }
            },
            billingAddress: {
                type: DataTypes.JSON,
                allowNull: true,
                validate: {
                    isValidBillingAddress(value) {
                        if (value && typeof value === 'object') {
                            const requiredFields = ['street', 'city', 'state', 'zipCode', 'country'];
                            const missingFields = requiredFields.filter(field => !value[field]);
                            if (missingFields.length > 0) {
                                throw new Error(`Missing required billing address fields: ${missingFields.join(', ')}`);
                            }
                        }
                    }
                }
            },
            failedPaymentCount: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Failed payment count must be non-negative'
                    }
                }
            }
        },
        {
            sequelize,
            modelName: "UserSubscription",
            tableName: "user_subscriptions",
            timestamps: true,
            underscored: true,
            paranoid: true,
            indexes: [
                { fields: ["user_id"] },
                { fields: ["plan_id"] },
                { fields: ["status"] },
                { fields: ["next_billing_date"] },
                { fields: ["end_date"] },
                { 
                    fields: ["user_id", "status"],
                    name: "user_subscriptions_user_status_idx"
                }
            ],
            validate: {
                async validateDateConsistency() {
                    if (this.startDate && this.endDate && this.startDate >= this.endDate) {
                        throw new Error('Start date must be before end date');
                    }
                    
                    if (this.trialStartDate && this.trialEndDate && this.trialStartDate >= this.trialEndDate) {
                        throw new Error('Trial start date must be before trial end date');
                    }
                    
                    if (this.trialStartDate && this.startDate && this.trialStartDate > this.startDate) {
                        throw new Error('Trial start date cannot be after subscription start date');
                    }
                },
                
                async validateStatusTransitions() {
                    if (this.changed('status')) {
                        const validTransitions = {
                            'PENDING': ['ACTIVE', 'CANCELLED'],
                            'ACTIVE': ['CANCELLED', 'SUSPENDED', 'EXPIRED'],
                            'SUSPENDED': ['ACTIVE', 'CANCELLED', 'EXPIRED'],
                            'CANCELLED': [],
                            'EXPIRED': ['ACTIVE']
                        };
                        
                        const currentStatus = this._previousDataValues?.status || 'PENDING';
                        const newStatus = this.status;
                        
                        if (!validTransitions[currentStatus]?.includes(newStatus)) {
                            throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
                        }
                    }
                },
                
                async validateUsageLimits() {
                    if (this.planId && this.currentListings !== undefined) {
                        const plan = await this.sequelize.models.SubscriptionPlan.findByPk(this.planId);
                        if (plan && this.currentListings > plan.maxListings) {
                            throw new Error(`Current listings (${this.currentListings}) exceed plan limit (${plan.maxListings})`);
                        }
                    }
                }
            }
        }
    );

    return UserSubscription;
};


