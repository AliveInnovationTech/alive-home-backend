"use strict";
const { Model, Op } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class Property extends Model {
        static associate(models) {
            Property.belongsTo(models.User, {
                foreignKey: 'ownerId',
                as: 'owner'
            });

            Property.hasMany(models.PropertyListing, {
                foreignKey: 'propertyId',
                as: 'listings'
            });

            Property.hasMany(models.Inquiry, {
                foreignKey: 'propertyId',
                as: 'inquiries'
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
            address: {
                type: DataTypes.STRING,
                allowNull: false
            },
            city: {
                type: DataTypes.STRING,
                allowNull: false
            },
            state: {
                type: DataTypes.STRING(2),
                allowNull: false
            },
            zipCode: {
                type: DataTypes.STRING(10),
                allowNull: false
            },
            propertyType: {
                type: DataTypes.ENUM(
                    'SINGLE_FAMILY',
                    'MULTI_FAMILY',
                    'CONDO',
                    'APARTMENT',
                    'COMMERCIAL',
                    'LAND',
                    'VILLA',
                    'TOWNHOUSE'
                ),
                allowNull: false
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
            }
        },
        {
            sequelize,
            modelName: "Property",
            tableName: "properties",
            timestamps: true,
            indexes: [
                { fields: ['city'] },
                { fields: ['propertyType'] },
                { fields: ['ownerId'] },
                { fields: ['latitude', 'longitude'], using: 'GIST' },
                {
                    type: 'FULLTEXT',
                    fields: ['address', 'city', 'state', 'zipCode']
                }
            ],
            hooks: {
                beforeValidate: (property) => {
                    if (property.latitude) {
                        property.latitude = parseFloat(property.latitude.toFixed(6));
                    }
                    if (property.longitude) {
                        property.longitude = parseFloat(property.longitude.toFixed(6));
                    }
                }
            }
        }
    );

    return Property;
};