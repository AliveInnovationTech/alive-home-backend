"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class Recommendation extends Model {
        static associate(models) {
            Recommendation.belongsTo(models.User, {
                foreignKey: 'userId',
                as: 'user',
                onDelete: 'CASCADE'
            });

            Recommendation.belongsTo(models.Property, {
                foreignKey: 'propertyId',
                as: 'property',
                onDelete: 'CASCADE'
            });

            Recommendation.belongsTo(models.Listing, {
                foreignKey: 'listingId',
                as: 'listing',
                onDelete: 'CASCADE'
            });

            Recommendation.belongsTo(models.UserBehavior, {
                foreignKey: 'triggerBehaviorId',
                as: 'triggerBehavior',
                onDelete: 'SET NULL'
            });
        }
    }

    Recommendation.init(
        {
            recommendationId: {
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
            triggerBehaviorId: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'user_behaviors',
                    key: 'behaviorId'
                },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            },
            recommendationType: {
                type: DataTypes.ENUM('SIMILAR_PROPERTY', 'PRICE_DROP', 'NEW_LISTING', 'LOCATION_BASED', 'PREFERENCE_MATCH', 'TRENDING', 'SEASONAL', 'MARKET_INSIGHT'),
                allowNull: false,
                validate: {
                    notEmpty: {
                        msg: 'Recommendation type is required'
                    }
                }
            },
            recommendationReason: {
                type: DataTypes.TEXT,
                allowNull: true,
                validate: {
                    len: {
                        args: [0, 500],
                        msg: 'Recommendation reason must be less than 500 characters'
                    }
                }
            },
            confidenceScore: {
                type: DataTypes.DECIMAL(3, 2),
                allowNull: false,
                defaultValue: 0.50,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Confidence score cannot be negative'
                    },
                    max: {
                        args: [1],
                        msg: 'Confidence score cannot exceed 1'
                    }
                },
                comment: 'AI confidence in recommendation (0-1)'
            },
            relevanceScore: {
                type: DataTypes.DECIMAL(3, 2),
                allowNull: false,
                defaultValue: 0.50,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Relevance score cannot be negative'
                    },
                    max: {
                        args: [1],
                        msg: 'Relevance score cannot exceed 1'
                    }
                },
                comment: 'Relevance to user preferences (0-1)'
            },
            userLocation: {
                type: DataTypes.JSON,
                allowNull: true,
                comment: 'User location when recommendation was generated {latitude, longitude}'
            },
            propertyLocation: {
                type: DataTypes.JSON,
                allowNull: true,
                comment: 'Property location {latitude, longitude}'
            },
            distanceKm: {
                type: DataTypes.DECIMAL(8, 2),
                allowNull: true,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Distance cannot be negative'
                    }
                },
                comment: 'Distance between user and property in kilometers'
            },
            travelTimeMinutes: {
                type: DataTypes.INTEGER,
                allowNull: true,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Travel time cannot be negative'
                    }
                },
                comment: 'Estimated travel time in minutes'
            },
            priceComparison: {
                type: DataTypes.JSON,
                allowNull: true,
                comment: 'Price comparison data {similarProperties, marketAverage, priceTrend}'
            },
            marketInsights: {
                type: DataTypes.JSON,
                allowNull: true,
                comment: 'Market insights and trends data'
            },
            userPreferences: {
                type: DataTypes.JSON,
                allowNull: true,
                comment: 'User preferences used for recommendation'
            },
            algorithmVersion: {
                type: DataTypes.STRING(50),
                allowNull: true,
                validate: {
                    len: {
                        args: [1, 50],
                        msg: 'Algorithm version must be between 1 and 50 characters'
                    }
                },
                comment: 'Version of recommendation algorithm used'
            },
            modelFeatures: {
                type: DataTypes.JSON,
                allowNull: true,
                comment: 'Features used by the recommendation model'
            },
            status: {
                type: DataTypes.ENUM('ACTIVE', 'VIEWED', 'CLICKED', 'DISMISSED', 'EXPIRED', 'ARCHIVED'),
                allowNull: false,
                defaultValue: 'ACTIVE',
                validate: {
                    notEmpty: {
                        msg: 'Status is required'
                    }
                }
            },
            viewedAt: {
                type: DataTypes.DATE,
                allowNull: true
            },
            clickedAt: {
                type: DataTypes.DATE,
                allowNull: true
            },
            dismissedAt: {
                type: DataTypes.DATE,
                allowNull: true
            },
            expiresAt: {
                type: DataTypes.DATE,
                allowNull: true,
                comment: 'When recommendation expires'
            },
            priority: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 5,
                validate: {
                    min: {
                        args: [1],
                        msg: 'Priority must be at least 1'
                    },
                    max: {
                        args: [10],
                        msg: 'Priority cannot exceed 10'
                    }
                },
                comment: 'Display priority (1-10, higher is more important)'
            },
            metadata: {
                type: DataTypes.JSON,
                allowNull: true,
                comment: 'Additional metadata for recommendation'
            }
        },
        {
            tableName: 'recommendations',
            underscored: true,
            paranoid: true,
            timestamps: true,
            indexes: [
                {
                    fields: ['userId']
                },
                {
                    fields: ['propertyId']
                },
                {
                    fields: ['listingId']
                },
                {
                    fields: ['recommendationType']
                },
                {
                    fields: ['status']
                },
                {
                    fields: ['priority']
                },
                {
                    fields: ['confidenceScore']
                },
                {
                    fields: ['relevanceScore']
                },
                {
                    fields: ['createdAt']
                },
                {
                    fields: ['expiresAt']
                },
                {
                    fields: ['userId', 'status']
                },
                {
                    fields: ['userId', 'recommendationType']
                },
                {
                    fields: ['propertyId', 'status']
                }
            ],
            hooks: {
                beforeCreate: (recommendation) => {
                    // Calculate priority based on confidence and relevance scores
                    if (!recommendation.priority || recommendation.priority === 5) {
                        const avgScore = (recommendation.confidenceScore + recommendation.relevanceScore) / 2;
                        recommendation.priority = Math.round(avgScore * 10);
                    }

                    // Set expiration date for certain recommendation types
                    if (!recommendation.expiresAt) {
                        const expirationDays = {
                            'PRICE_DROP': 7,
                            'NEW_LISTING': 14,
                            'TRENDING': 3,
                            'SEASONAL': 30,
                            'MARKET_INSIGHT': 7
                        };
                        
                        const days = expirationDays[recommendation.recommendationType] || 30;
                        recommendation.expiresAt = new Date(Date.now() + (days * 24 * 60 * 60 * 1000));
                    }
                },
                beforeUpdate: (recommendation) => {
                    // Update timestamps based on status changes
                    const previousStatus = recommendation._previousDataValues?.status;
                    const currentStatus = recommendation.status;
                    
                    if (previousStatus !== currentStatus) {
                        switch (currentStatus) {
                            case 'VIEWED':
                                recommendation.viewedAt = new Date();
                                break;
                            case 'CLICKED':
                                recommendation.clickedAt = new Date();
                                break;
                            case 'DISMISSED':
                                recommendation.dismissedAt = new Date();
                                break;
                        }
                    }
                }
            }
        }
    );

    return Recommendation;
};

