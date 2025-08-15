"use strict";
const { Model, Op } = require("sequelize");
const {INQUIRY_STATUS, INQUIRY_TYPE} = require("../utils/constants")

module.exports = (sequelize, DataTypes) => {
    
    class Inquiry extends Model {
        static associate(models) {
            // Association to PropertyListing
            Inquiry.belongsTo(models.PropertyListing, {
                foreignKey: 'listingId',
                as: 'listing',
                onDelete: 'CASCADE'
            });

            // Association to User (inquirer)
            Inquiry.belongsTo(models.User, {
                foreignKey: 'inquirerId',
                as: 'inquirer',
                onDelete: 'CASCADE'
            });

            // Association to User (agent/responder)
            Inquiry.belongsTo(models.User, {
                foreignKey: 'responderId',
                as: 'responder',
                onDelete: 'SET NULL'
            });

            // Association to related transaction
            Inquiry.hasOne(models.Transaction, {
                foreignKey: 'inquiryId',
                as: 'transaction',
                onDelete: 'SET NULL'
            });
        }

        static async findOpenInquiries(userId) {
            return this.findAll({
                where: {
                    inquirerId: userId,
                    status: {
                        [Op.notIn]: [INQUIRY_STATUS.RESOLVED, INQUIRY_STATUS.ARCHIVED]
                    }
                },
                include: ['listing']
            });
        }

        markAsContacted(responderId) {
            return this.update({
                status: INQUIRY_STATUS.CONTACTED,
                contactedAt: new Date(),
                responderId
            });
        }
    }

    Inquiry.init(
        {
            inquiryId: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false
            },
            listingId: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'property_listings',
                    key: 'listing_id'
                }
            },
            inquirerId: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'user_id'
                }
            },
            responderId: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'user_id'
                }
            },
            type: {
                type: DataTypes.ENUM(...Object.values(INQUIRY_TYPE)),
                defaultValue: INQUIRY_TYPE.GENERAL,
                allowNull: false
            },
            message: {
                type: DataTypes.TEXT,
                allowNull: false,
                validate: {
                    notEmpty: {
                        msg: 'Inquiry message cannot be empty'
                    },
                    len: {
                        args: [10, 2000],
                        msg: 'Message must be between 10 and 2000 characters'
                    }
                }
            },
            status: {
                type: DataTypes.ENUM(...Object.values(INQUIRY_STATUS)),
                defaultValue: INQUIRY_STATUS.PENDING,
                allowNull: false
            },
            contactPreference: {
                type: DataTypes.ENUM('EMAIL', 'PHONE', 'SMS', 'IN_APP'),
                defaultValue: 'EMAIL'
            },
            contactedAt: {
                type: DataTypes.DATE,
                allowNull: true
            },
            responseNotes: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            metadata: {
                type: DataTypes.JSONB,
                defaultValue: {}
            }
        },
        {
            sequelize,
            modelName: "Inquiry",
            tableName: "inquiries",
            timestamps: true,
            paranoid: true, // Enables soft deletes
            underscored: true,
            indexes: [
                { fields: ['status'] },
                { fields: ['type'] },
                { fields: ['inquirer_id'] },
                { fields: ['listing_id'] },
                { fields: ['created_at'] }
            ],
            scopes: {
                active: {
                    where: {
                        status: {
                            [Op.notIn]: [INQUIRY_STATUS.RESOLVED, INQUIRY_STATUS.ARCHIVED]
                        }
                    }
                },
                forListing(listingId) {
                    return {
                        where: { listingId }
                    };
                },
                withUser: {
                    include: ['inquirer']
                },
                withListing: {
                    include: ['listing']
                }
            },
            hooks: {
                beforeUpdate: (inquiry) => {
                    // Automatically set contactedAt when status changes to CONTACTED
                    if (inquiry.changed('status') &&
                        inquiry.status === INQUIRY_STATUS.CONTACTED &&
                        !inquiry.contactedAt) {
                        inquiry.contactedAt = new Date();
                    }

                    const originalStatus = inquiry.previous('status');
                    if (
                        [INQUIRY_STATUS.RESOLVED, INQUIRY_STATUS.ARCHIVED].includes(originalStatus) &&
                        originalStatus !== inquiry.status
                    ) {
                        throw new Error('Cannot modify resolved or archived inquiries');
                    }
                }
            }
        }
    );

    return Inquiry;
};