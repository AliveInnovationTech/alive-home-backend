"use strict";
const { Model } = require("sequelize");
const logger = require("../utils/logger");

module.exports = (sequelize, DataTypes) => {
    class UserBehavior extends Model {
        static associate(models) {
            UserBehavior.belongsTo(models.User, {
                foreignKey: 'userId',
                as: 'user',
                onDelete: 'CASCADE'
            });

            UserBehavior.belongsTo(models.Property, {
                foreignKey: 'propertyId',
                as: 'property',
                onDelete: 'CASCADE'
            });

            UserBehavior.belongsTo(models.Listing, {
                foreignKey: 'listingId',
                as: 'listing',
                onDelete: 'CASCADE'
            });
        }
    }

    UserBehavior.init(
        {
            behaviorId: {
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
                    key: 'userId'
                },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            },
            behaviorType: {
                type: DataTypes.ENUM('SEARCH', 'PROPERTY_VIEW', 'PROPERTY_FAVORITE', 'PROPERTY_SHARE', 'CONTACT_AGENT', 'SCHEDULE_VIEWING', 'PRICE_ALERT', 'LOCATION_FAVORITE'),
                allowNull: false,
                validate: {
                    notEmpty: {
                        msg: 'Behavior type is required'
                    }
                }
            },
            propertyId: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'properties',
                    key: 'propertyId'
                },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            },
            listingId: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'listings',
                    key: 'listingId'
                },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            },
            searchQuery: {
                type: DataTypes.TEXT,
                allowNull: true,
                validate: {
                    len: {
                        args: [0, 1000],
                        msg: 'Search query must be less than 1000 characters'
                    }
                }
            },
            searchFilters: {
                type: DataTypes.JSON,
                allowNull: true,
                comment: 'Stores search filters like price range, bedrooms, property type, etc.'
            },
            searchLocation: {
                type: DataTypes.STRING(255),
                allowNull: true,
                validate: {
                    len: {
                        args: [0, 255],
                        msg: 'Search location must be less than 255 characters'
                    }
                }
            },
            userLocation: {
                type: DataTypes.JSON,
                allowNull: true,
                comment: 'User\'s current location coordinates {latitude, longitude}'
            },
            viewDuration: {
                type: DataTypes.INTEGER,
                allowNull: true,
                validate: {
                    min: {
                        args: [0],
                        msg: 'View duration cannot be negative'
                    }
                },
                comment: 'Duration in seconds user spent viewing property'
            },
            interactionScore: {
                type: DataTypes.DECIMAL(3, 2),
                allowNull: true,
                defaultValue: 0.00,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Interaction score cannot be negative'
                    },
                    max: {
                        args: [1],
                        msg: 'Interaction score cannot exceed 1'
                    }
                },
                comment: 'AI-calculated engagement score (0-1)'
            },
            userPreferences: {
                type: DataTypes.JSON,
                allowNull: true,
                comment: 'User preferences extracted from behavior patterns'
            },
            deviceInfo: {
                type: DataTypes.JSON,
                allowNull: true,
                comment: 'Device information for analytics'
            },
            sessionId: {
                type: DataTypes.STRING(100),
                allowNull: true,
                validate: {
                    len: {
                        args: [1, 100],
                        msg: 'Session ID must be between 1 and 100 characters'
                    }
                }
            },
            ipAddress: {
                type: DataTypes.STRING(45),
                allowNull: true,
                validate: {
                    isIP: {
                        msg: 'Invalid IP address format'
                    }
                }
            },
            userAgent: {
                type: DataTypes.TEXT,
                allowNull: true,
                validate: {
                    len: {
                        args: [0, 500],
                        msg: 'User agent must be less than 500 characters'
                    }
                }
            },
            referrer: {
                type: DataTypes.STRING(500),
                allowNull: true,
                validate: {
                    len: {
                        args: [0, 500],
                        msg: 'Referrer URL must be less than 500 characters'
                    }
                }
            },
            metadata: {
                type: DataTypes.JSON,
                allowNull: true,
                comment: 'Additional metadata for analytics'
            }
        },
        {
            tableName: 'user_behaviors',
            underscored: true,
            paranoid: true,
            timestamps: true,
            indexes: [
                {
                    fields: ['userId']
                },
                {
                    fields: ['behaviorType']
                },
                {
                    fields: ['propertyId']
                },
                {
                    fields: ['listingId']
                },
                {
                    fields: ['createdAt']
                },
                {
                    fields: ['userId', 'behaviorType']
                },
                {
                    fields: ['userId', 'propertyId']
                },
                {
                    fields: ['sessionId']
                }
            ],
            hooks: {
                beforeCreate: (behavior) => {
                    // Set default interaction score for certain behavior types
                    if (!behavior.interactionScore) {
                        const defaultScores = {
                            'PROPERTY_VIEW': 0.3,
                            'PROPERTY_FAVORITE': 0.8,
                            'CONTACT_AGENT': 0.9,
                            'SCHEDULE_VIEWING': 1.0,
                            'SEARCH': 0.1,
                            'PROPERTY_SHARE': 0.6,
                            'PRICE_ALERT': 0.7,
                            'LOCATION_FAVORITE': 0.5
                        };
                        behavior.interactionScore = defaultScores[behavior.behaviorType] || 0.1;
                    }
                },
                afterCreate: async (behavior) => {
                    // Update user preferences based on behavior
                    if (behavior.behaviorType === 'PROPERTY_VIEW' && behavior.propertyId) {
                        try {
                            const { Property } = require('./index.js')(sequelize);
                            const property = await Property.findByPk(behavior.propertyId);
                            
                            if (property) {
                                // Extract preferences from property attributes
                                const preferences = {
                                    propertyType: property.propertyType,
                                    priceRange: {
                                        min: property.price * 0.8,
                                        max: property.price * 1.2
                                    },
                                    bedrooms: property.bedrooms,
                                    bathrooms: property.bathrooms,
                                    location: {
                                        city: property.city,
                                        state: property.state
                                    }
                                };
                                
                                behavior.userPreferences = preferences;
                                await behavior.save();
                            }
                        } catch (error) {
                            logger.error('Failed to update user preferences', { error: error.message, behaviorId: behavior.behaviorId });
                        }
                    }
                }
            }
        }
    );

    return UserBehavior;
};

