"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class PropertyMedia extends Model {
        static associate(models) {
            PropertyMedia.belongsTo(models.Property, {
                foreignKey: 'propertyId',
                as: 'property'
            });

            PropertyMedia.belongsTo(models.User, {
                foreignKey: 'uploadedBy',
                as: 'uploader'
            });
            
        }
    }

    PropertyMedia.init(
        {
            mediaId: {
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
            mediaType: {
                type: DataTypes.ENUM(
                    'IMAGE',
                    'VIDEO',
                    'VIRTUAL_TOUR',
                    'FLOOR_PLAN'),
                allowNull: false,
                defaultValue: 'IMAGE'
            },
            fileName: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    notEmpty: {
                        msg: 'File name is required'
                    }
                }
            },
            fileSize: {
                type: DataTypes.INTEGER,
                allowNull: false,
                validate: {
                    min: {
                        args: [1],
                        msg: 'File size must be positive'
                    }
                }
            },
            mimeType: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    notEmpty: {
                        msg: 'MIME type is required'
                    }
                }
            },
            originalName: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    notEmpty: {
                        msg: 'Original file name is required'
                    }
                }
            },
            cloudinaryId: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    notEmpty: {
                        msg: 'Cloudinary ID is required'
                    }
                }
            },
            cloudinaryUrl: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    isUrl: {
                        msg: 'Invalid URL format for cloudinary URL'
                    },
                    notEmpty: {
                        msg: 'Cloudinary URL is required'
                    }
                }
            },
            title: {
                type: DataTypes.STRING,
                validate: {
                    len: {
                        args: [0, 255],
                        msg: 'Title must be between 0 and 255 characters'
                    }
                }
            },
            description: {
                type: DataTypes.TEXT,
                validate: {
                    len: {
                        args: [0, 1000],
                        msg: 'Description must be between 0 and 1000 characters'
                    }
                }
            },
            altText: {
                type: DataTypes.STRING,
                validate: {
                    len: {
                        args: [0, 255],
                        msg: 'Alt text must be between 0 and 255 characters'
                    }
                }
            },
            displayOrder: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Display order cannot be negative'
                    }
                }
            },
            isMainImage: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            },
            isFeatured: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            },
            width: {
                type: DataTypes.INTEGER,
                validate: {
                    min: {
                        args: [1],
                        msg: 'Width must be positive'
                    }
                }
            },
            height: {
                type: DataTypes.INTEGER,
                validate: {
                    min: {
                        args: [1],
                        msg: 'Height must be positive'
                    }
                }
            },
            duration: {
                type: DataTypes.INTEGER,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Duration cannot be negative'
                    }
                }
            },
            compressionQuality: {
                type: DataTypes.INTEGER,
                validate: {
                    min: {
                        args: [1],
                        msg: 'Compression quality must be at least 1'
                    },
                    max: {
                        args: [100],
                        msg: 'Compression quality cannot exceed 100'
                    }
                }
            },
            uploadedBy: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'user_id'
                },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            },

            isActive: {
                type: DataTypes.BOOLEAN,
                defaultValue: true
            },
            isProcessed: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            }
        },
        {
            sequelize,
            modelName: "PropertyMedia",
            tableName: "property_media",
            timestamps: true,
            underscored: true,
            paranoid: true,
            indexes: [
                { fields: ["property_id"] },
                { fields: ["media_type"] },
                { fields: ["display_order"] },
                { fields: ["is_main_image"] },
                { fields: ["uploaded_by"] },
                { fields: ["is_active"] }
            ]
        }
    );

    PropertyMedia.beforeSave(async (media, { transaction }) => {
        if (media.isMainImage) {
            const count = await PropertyMedia.count({
                where: { propertyId: media.propertyId, isMainImage: true },
                transaction
            });
            if (count > 0) throw new Error('Only one main image allowed per property');
        }
    });

    return PropertyMedia;
};
