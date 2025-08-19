"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class Listing extends Model {
        static associate(models) {
            Listing.belongsTo(models.Property, {
                foreignKey: 'propertyId',
                as: 'property'
            });

            Listing.belongsTo(models.User, {
                foreignKey: 'listedBy',
                as: 'lister'
            });

            Listing.hasMany(models.Inquiry, { foreignKey: 'listingId', as: 'inquiries' });

            Listing.hasMany(models.UserBehavior, {
                foreignKey: 'listingId',
                as: 'behaviors',
                onDelete: 'CASCADE'
            });

            Listing.hasMany(models.Recommendation, {
                foreignKey: 'listingId',
                as: 'recommendations',
                onDelete: 'CASCADE'
            });
        }
    }

    Listing.init(
        {
            listingId: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false
            },
            propertyId: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'properties',
                    key: 'property_id'
                },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            },
            listedBy: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'user_id'
                },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            },
            listingStatus: {
                type: DataTypes.ENUM(
                    'DRAFT',
                    'ACTIVE',
                    'PENDING',
                    'SOLD',
                    'WITHDRAWN',
                    'EXPIRED'),
                allowNull: false,
                defaultValue: 'DRAFT'
            },
            listingPrice: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: false,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Listing price cannot be negative'
                    }
                }
            },
            originalPrice: {
                type: DataTypes.DECIMAL(12, 2),
                validate: {
                    min: {
                        args: [0],
                        msg: 'Original price cannot be negative'
                    }
                }
            },
            priceHistory: {
                type: DataTypes.JSON,
                defaultValue: []
            },
            marketingDescription: {
                type: DataTypes.TEXT,
                allowNull: false,
                validate: {
                    notEmpty: {
                        msg: 'Marketing description is required'
                    }
                }
            },
            listedDate: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW
            },
            lastUpdated: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW
            },
            expirationDate: {
                type: DataTypes.DATE,
                validate: {
                    isAfterNow(value) {
                        if (value && new Date(value) <= new Date()) {
                            throw new Error('Expiration date must be in the future');
                        }
                    }
                }
            },
            soldDate: {
                type: DataTypes.DATE,
                validate: {
                    isBeforeNow(value) {
                        if (value && new Date(value) > new Date()) {
                            throw new Error('Sold date cannot be in the future');
                        }
                    }
                }
            },
            virtualTourUrl: {
                type: DataTypes.STRING,
                validate: {
                    isUrl: {
                        msg: 'Invalid URL format for virtual tour'
                    }
                }
            },
            isOpenHouse: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            },
            openHouseSchedule: {
                type: DataTypes.JSON,
                defaultValue: []
            },
            viewCount: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                validate: {
                    min: {
                        args: [0],
                        msg: 'View count cannot be negative'
                    }
                }
            },
            inquiryCount: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Inquiry count cannot be negative'
                    }
                }
            },
            favoriteCount: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Favorite count cannot be negative'
                    }
                }
            },
            mlsNumber: {
                type: DataTypes.STRING,
                validate: {
                    notEmpty: {
                        msg: 'MLS number cannot be empty if provided'
                    }
                }
            },
            mlsStatus: {
                type: DataTypes.STRING,
                validate: {
                    notEmpty: {
                        msg: 'MLS status cannot be empty if provided'
                    }
                }
            },
            commissionRate: {
                type: DataTypes.DECIMAL(5, 2),
                validate: {
                    min: {
                        args: [0],
                        msg: 'Commission rate cannot be negative'
                    },
                    max: {
                        args: [100],
                        msg: 'Commission rate cannot exceed 100%'
                    }
                }
            },
            commissionAmount: {
                type: DataTypes.DECIMAL(12, 2),
                validate: {
                    min: {
                        args: [0],
                        msg: 'Commission amount cannot be negative'
                    }
                }
            }
        },
        {
            sequelize,
            modelName: "Listing",
            tableName: "listings",
            timestamps: true,
            underscored: true,
            paranoid: true,
            validate: {
                soldRequiresSoldDate() {
                    if (this.listingStatus === 'SOLD' && !this.soldDate) throw new Error('soldDate is required when SOLD');
                },
                soldDateOnlyWhenSold() {
                    if (this.soldDate && this.listingStatus !== 'SOLD') throw new Error('soldDate only when SOLD');
                },
                expirationNotWhenSold() {
                    if (this.expirationDate && this.listingStatus === 'SOLD') throw new Error('No expirationDate when SOLD');
                }
            },
            indexes: [
                { fields: ["listing_status"] },
                { fields: ["listing_price"] },
                { fields: ["listed_date"] },
                { fields: ["property_id"] },
                { fields: ["listed_by"] },
                {
                    fields: ['mls_number'],
                    unique: true,
                    where: { deleted_at: null }
                }
            ]
        }
    );

    Listing.beforeUpdate((listing) => { listing.lastUpdated = new Date(); });

    return Listing;
};
