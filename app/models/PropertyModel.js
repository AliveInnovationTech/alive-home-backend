"use strict";
const { Model, Op } = require("sequelize");
const { PROPERTY_TYPES,PROPERTY_STATUS } = require("../utils/constants")

module.exports = (sequelize, DataTypes) => {
    class Property extends Model {
        static associate(models) {
            Property.belongsTo(models.User, {
                foreignKey: 'ownerId',
                as: 'owner'
            });

            Property.hasMany(models.Listing, {
                foreignKey: 'propertyId',
                as: 'listings'
            });
            Property.hasMany(models.PropertyMedia, {
                foreignKey: 'propertyId',
                as: 'media',
                onDelete: 'CASCADE'
            });


            Property.hasMany(models.Inquiry, {
                foreignKey: 'propertyId',
                as: 'inquiries'
            });
            Property.hasMany(models.Transaction, {
                foreignKey: "propertyId",
                as: "transactions"
            });
        }
        getCoordinates() {
            return {
                latitude: this.latitude,
                longitude: this.longitude
            };
        }

        static async findWithinRadius(latitude, longitude, radius = 10) {
            const earthRadius = 6371;

            return this.findAll({
                attributes: {
                    include: [
                        [
                            sequelize.literal(`
                ${earthRadius} * ACOS(
                  COS(RADIANS(${latitude})) *
                  COS(RADIANS(latitude)) *
                  COS(RADIANS(longitude) - RADIANS(${longitude})) +
                  SIN(RADIANS(${latitude})) *
                  SIN(RADIANS(latitude))
                )
              `),
                            'distance'
                        ]
                    ]
                },
                having: sequelize.where(sequelize.literal('distance'), '<=', radius),
                order: [['distance', 'ASC']]
            });
        }
    }

    Property.init(
        {
            propertyId: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false
            },
            ownerId: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'user_id'
                }
            },
            title: {
                type: DataTypes.STRING,
                allowNull: false
            },
            price: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: false,
                validate: {
                    min: {
                        args: [0],
                        msg: 'property price cannot be negative'
                    }
                }
            },
            address: {
                type: DataTypes.STRING,
                allowNull: false
            },
            city: {
                type: DataTypes.STRING,
                allowNull: false
            },
            state: {
                type: DataTypes.STRING(100),
                allowNull: false
            },
            zipCode: {
                type: DataTypes.STRING(10),
                allowNull: false
            },
            propertyType: {
                type: DataTypes.ENUM(
                    PROPERTY_TYPES.DETACHED_HOUSE,
                    PROPERTY_TYPES.SEMI_DETACHED,
                    PROPERTY_TYPES.TERRACE_HOUSE,
                    PROPERTY_TYPES.DUPLEX,
                    PROPERTY_TYPES.BUNGALOW,
                    PROPERTY_TYPES.MANSION,
                    PROPERTY_TYPES.VILLA,
                    PROPERTY_TYPES.ESTATE_HOUSE,
                    PROPERTY_TYPES.TOWNHOUSE,
                    PROPERTY_TYPES.COMPOUND,
                    PROPERTY_TYPES.CHALET,
                    PROPERTY_TYPES.BOYS_QUARTERS,
                    PROPERTY_TYPES.HOUSE,
                    PROPERTY_TYPES.APARTMENT,
                    PROPERTY_TYPES.PENTHOUSE,
                    PROPERTY_TYPES.MINI_FLAT,
                    PROPERTY_TYPES.SELF_CONTAINED,
                    PROPERTY_TYPES.ROOM_AND_PARLOUR,
                    PROPERTY_TYPES.SERVICED_APARTMENT,
                    PROPERTY_TYPES.COMMERCIAL_OFFICE,
                    PROPERTY_TYPES.RETAIL_SHOP,
                    PROPERTY_TYPES.WAREHOUSE,
                    PROPERTY_TYPES.COMMERCIAL_PLAZA,
                    PROPERTY_TYPES.HOTEL,
                    PROPERTY_TYPES.LAND_RESIDENTIAL,
                    PROPERTY_TYPES.LAND_COMMERCIAL,
                    PROPERTY_TYPES.LAND_INDUSTRIAL,
                    PROPERTY_TYPES.LAND_AGRICULTURAL,
                    PROPERTY_TYPES.STUDENT_HOSTEL,
                    PROPERTY_TYPES.LAND,
                    PROPERTY_TYPES.COMMERCIAL,
                    PROPERTY_TYPES.CONDO,
                    PROPERTY_TYPES.CO_WORKING_SPACE,
                    PROPERTY_TYPES.MULTIFAMILY,
                    PROPERTY_TYPES.SINGLE_FAMILY
                ),
                validate: { isIn: [Object.values(PROPERTY_TYPES)] },
                defaultValue: PROPERTY_TYPES.APARTMENT,
                allowNull: false,
            },
            bedrooms: {
                type: DataTypes.INTEGER,
                allowNull: false,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Bedrooms cannot be negative'
                    }
                }
            },
            bathrooms: {
                type: DataTypes.FLOAT,
                allowNull: false,
                validate: {
                    min: {
                        args: [0.5],
                        msg: 'Must have at least 0.5 bathrooms'
                    }
                }
            },
            squareFeet: {
                type: DataTypes.INTEGER,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Square footage cannot be negative'
                    }
                }
            },
            latitude: {
                type: DataTypes.FLOAT,
                allowNull: false,
                validate: {
                    min: {
                        args: [-90],
                        msg: 'Latitude must be between -90 and 90'
                    },
                    max: {
                        args: [90],
                        msg: 'Latitude must be between -90 and 90'
                    }
                }
            },
            longitude: {
                type: DataTypes.FLOAT,
                allowNull: false,
                validate: {
                    min: {
                        args: [-180],
                        msg: 'Longitude must be between -180 and 180'
                    },
                    max: {
                        args: [180],
                        msg: 'Longitude must be between -180 and 180'
                    }
                }
            },
            yearBuilt: {
                type: DataTypes.INTEGER,
                validate: {
                    min: {
                        args: [1800],
                        msg: 'Year built must be after 1800'
                    }
                }
            },
            lotSize: {
                type: DataTypes.INTEGER,
                comment: 'Lot size in square feet'
            },
            description: {
                type: DataTypes.TEXT
            },
            features: {
                type: DataTypes.JSONB,
                defaultValue: []
            },
            status: {
                type: DataTypes.ENUM(
                    PROPERTY_STATUS.ACTIVE,
                    PROPERTY_STATUS.PENDING,
                    PROPERTY_STATUS.DRAFT,
                    PROPERTY_STATUS.SOLD,
                    PROPERTY_STATUS.UNAVAILABLE,
                    PROPERTY_STATUS.AVAILABLE
                ),
                validate: { isIn: [Object.values(PROPERTY_STATUS)] },
                defaultValue: PROPERTY_STATUS.AVAILABLE
            }
        },
        {
            sequelize,
            modelName: "Property",
            tableName: "properties",
            underscored: true,
            timestamps: true,
            indexes: [
                { fields: ['city'] },
                { fields: ['property_type'] },
                { fields: ['owner_id'] },
                { fields: ['latitude', 'longitude'] },
                {
                    type: 'FULLTEXT',
                    fields: ['address', 'city', 'state', 'zip_code']
                }
            ],
            hooks: {
                beforeValidate: (property) => {
                    if (property.latitude) {
                        property.latitude = parseFloat(property.latitude);
                    }
                    if (property.longitude) {
                        property.longitude = parseFloat(property.longitude);
                    }
                }
            }
        }
    );

    return Property;
};