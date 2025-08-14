const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize) => {
  const Transaction = sequelize.define('Transaction', {
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
        key: 'userId'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    propertyId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'properties',
        key: 'propertyId'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    subscriptionId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'user_subscriptions',
        key: 'subscriptionId'
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
      unique: true,
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
        key: 'transactionId'
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
        key: 'userId'
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
    tableName: 'transactions',
    underscored: true,
    paranoid: true,
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['transactionType']
      },
      {
        fields: ['status']
      },
      {
        fields: ['referenceNumber'],
        unique: true
      },
      {
        fields: ['externalTransactionId']
      },
      {
        fields: ['propertyId']
      },
      {
        fields: ['subscriptionId']
      },
      {
        fields: ['commissionRecipientId']
      },
      {
        fields: ['createdAt']
      }
    ],
    hooks: {
      beforeCreate: (transaction) => {
        if (!transaction.referenceNumber) {
          transaction.referenceNumber = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        }
      },
      beforeUpdate: (transaction) => {
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
      }
    }
  });

  Transaction.associate = (models) => {
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
  };

  return Transaction;
};
