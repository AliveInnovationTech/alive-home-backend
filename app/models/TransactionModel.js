"use strict";
const { Model, DataTypes } = require('sequelize');
const crypto = require('crypto');

module.exports = (sequelize, DataTypes) => {
  class Transaction extends Model {
    static associate(models) {
      Transaction.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
        onDelete: 'CASCADE'
      });

      Transaction.belongsTo(models.Property, {
        foreignKey: 'propertyId',
        as: 'property',
        onDelete: 'SET NULL'
      });

      Transaction.belongsTo(models.UserSubscription, {
        foreignKey: 'subscriptionId',
        as: 'subscription',
        onDelete: 'SET NULL'
      });

      Transaction.belongsTo(models.User, {
        foreignKey: 'commissionRecipientId',
        as: 'commissionRecipient',
        onDelete: 'SET NULL'
      });

      Transaction.belongsTo(models.Transaction, {
        foreignKey: 'parentTransactionId',
        as: 'parentTransaction',
        onDelete: 'SET NULL'
      });

      Transaction.hasMany(models.Transaction, {
        foreignKey: 'parentTransactionId',
        as: 'childTransactions',
        onDelete: 'SET NULL'
      });

      Transaction.hasMany(models.Payment, {
        foreignKey: 'transactionId',
        as: 'payments',
        onDelete: 'CASCADE'
      });
    }

    validateStatusTransitions() {
      const allowedTransitions = {
        'PENDING': ['PROCESSING', 'CANCELLED'],
        'PROCESSING': ['COMPLETED', 'FAILED', 'CANCELLED'],
        'COMPLETED': ['REFUNDED'],
        'FAILED': ['PENDING'],
        'CANCELLED': [],
        'REFUNDED': []
      };

      const previousStatus = this._previousDataValues?.status || 'PENDING';
      const currentStatus = this.status;

      if (!allowedTransitions[previousStatus]?.includes(currentStatus)) {
        throw new Error(`Invalid status transition from ${previousStatus} to ${currentStatus}`);
      }
    }
  }

  Transaction.init({
    transactionId: {
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
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    propertyId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'properties',
        key: 'property_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    subscriptionId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'user_subscriptions',
        key: 'subscription_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    transactionType: {
      type: DataTypes.ENUM('SUBSCRIPTION_PAYMENT', 'PROPERTY_PURCHASE', 'COMMISSION_PAYMENT', 'REFUND', 'DEPOSIT', 'WITHDRAWAL'),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        min: 0.01,
        notNull: {
          msg: 'Transaction amount is required'
        }
      }
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'USD',
      validate: {
        len: [3, 3],
        isIn: [['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR', 'NGN', 'GHS', 'KES', 'ZAR']]
      }
    },
    originalAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      validate: {
        min: 0.01
      }
    },
    exchangeRate: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: true,
      defaultValue: 1.000000,
      validate: {
        min: 0.000001
      }
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED'),
      allowNull: false,
      defaultValue: 'PENDING',
      validate: {
        notEmpty: true
      }
    },
    referenceNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: {
        name: 'transactions_reference_number_unique'
      },
      validate: {
        notEmpty: true,
        len: [1, 50]
      }
    },
    externalTransactionId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: [1, 100]
      }
    },
    parentTransactionId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'transactions',
        key: 'transaction_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 1000]
      }
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 2000]
      }
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    },
    commissionRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      }
    },
    commissionAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      validate: {
        min: 0
      }
    },
    commissionRecipientId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    failedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'transactions',
    underscored: true,
    paranoid: true,
    timestamps: true,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['transaction_type']
      },
      {
        fields: ['status']
      },
      {
        fields: ['external_transaction_id']
      },
      {
        fields: ['property_id']
      },
      {
        fields: ['subscription_id']
      },
      {
        fields: ['commission_recipient_id']
      },
      {
        fields: ['created_at']
      }
    ],
    hooks: {
      beforeCreate: (transaction) => {
        if (!transaction.referenceNumber) {
          transaction.referenceNumber = `TXN-${Date.now()}-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
        }
        
        // Set timestamps based on initial status
        if (transaction.status === 'PROCESSING') {
          transaction.processedAt = new Date();
        } else if (transaction.status === 'COMPLETED') {
          transaction.processedAt = new Date();
          transaction.completedAt = new Date();
        } else if (transaction.status === 'FAILED') {
          transaction.failedAt = new Date();
        } else if (transaction.status === 'CANCELLED') {
          transaction.cancelledAt = new Date();
        }
      },
      beforeUpdate: (transaction) => {
        // Validate status transitions
        transaction.validateStatusTransitions();
        
        const previousStatus = transaction._previousDataValues?.status;
        const currentStatus = transaction.status;
        
        if (previousStatus !== currentStatus) {
          switch (currentStatus) {
            case 'PROCESSING':
              transaction.processedAt = new Date();
              break;
            case 'COMPLETED':
              transaction.completedAt = new Date();
              break;
            case 'FAILED':
              transaction.failedAt = new Date();
              break;
            case 'CANCELLED':
              transaction.cancelledAt = new Date();
              break;
          }
        }
      },
      beforeSave: (transaction) => {
        // Set timestamps based on initial status on create
        if (transaction.isNewRecord) {
          if (transaction.status === 'PROCESSING') {
            transaction.processedAt = new Date();
          } else if (transaction.status === 'COMPLETED') {
            transaction.processedAt = new Date();
            transaction.completedAt = new Date();
          } else if (transaction.status === 'FAILED') {
            transaction.failedAt = new Date();
          } else if (transaction.status === 'CANCELLED') {
            transaction.cancelledAt = new Date();
          }
        }
      }
    },
    validate: {
      validateTransactionType() {
        // Type-specific validations
        switch (this.transactionType) {
          case 'SUBSCRIPTION_PAYMENT':
            if (!this.subscriptionId) {
              throw new Error('Subscription ID is required for subscription payments');
            }
            if (this.propertyId) {
              throw new Error('Property ID should not be set for subscription payments');
            }
            break;
          case 'PROPERTY_PURCHASE':
            if (!this.propertyId) {
              throw new Error('Property ID is required for property purchases');
            }
            if (this.subscriptionId) {
              throw new Error('Subscription ID should not be set for property purchases');
            }
            break;
          case 'COMMISSION_PAYMENT':
            if (!this.commissionRecipientId) {
              throw new Error('Commission recipient ID is required for commission payments');
            }
            if (!this.commissionRate && !this.commissionAmount) {
              throw new Error('Either commission rate or amount is required for commission payments');
            }
            break;
        }

        // Commission math consistency
        if (this.commissionRate && this.commissionAmount) {
          const calculatedAmount = (this.amount * this.commissionRate) / 100;
          const tolerance = 0.01; // Allow for rounding differences
          if (Math.abs(calculatedAmount - this.commissionAmount) > tolerance) {
            throw new Error('Commission amount does not match calculated amount from rate');
          }
        }
      }
    }
  });

  return Transaction;
};

