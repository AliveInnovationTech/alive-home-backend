const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize) => {
  const Payment = sequelize.define('Payment', {
    paymentId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    transactionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'transactions',
        key: 'transactionId'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    gatewayProvider: {
      type: DataTypes.ENUM('STRIPE', 'PAYPAL', 'RAZORPAY', 'FLUTTERWAVE', 'PAYSTACK', 'BANK_TRANSFER', 'CASH'),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    gatewayTransactionId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: [1, 100]
      }
    },
    gatewayReference: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: [1, 100]
      }
    },
    paymentMethod: {
      type: DataTypes.ENUM('CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'DIGITAL_WALLET', 'CASH', 'CHECK'),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    paymentMethodDetails: {
      type: DataTypes.JSON,
      allowNull: true
    },
    gatewayResponse: {
      type: DataTypes.JSON,
      allowNull: true
    },
    gatewayFees: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0.00,
      validate: {
        min: 0
      }
    },
    processingFees: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0.00,
      validate: {
        min: 0
      }
    },
    paymentStatus: {
      type: DataTypes.ENUM('INITIATED', 'PENDING', 'AUTHORIZED', 'CAPTURED', 'SETTLED', 'FAILED', 'CANCELLED', 'REFUNDED'),
      allowNull: false,
      defaultValue: 'INITIATED',
      validate: {
        notEmpty: true
      }
    },
    initiatedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    authorizedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    capturedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    settledAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    failedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      validate: {
        isIP: true
      }
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 1000]
      }
    },
    deviceFingerprint: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        len: [1, 255]
      }
    },
    riskScore: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      }
    },
    billingAddress: {
      type: DataTypes.JSON,
      allowNull: true
    },
    cardLast4: {
      type: DataTypes.STRING(4),
      allowNull: true,
      validate: {
        len: [4, 4],
        isNumeric: true
      }
    },
    cardBrand: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        len: [1, 20]
      }
    },
    cardExpiryMonth: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 12
      }
    },
    cardExpiryYear: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: new Date().getFullYear(),
        max: new Date().getFullYear() + 20
      }
    },
    webhookReceived: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    webhookProcessedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    webhookAttempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'userId'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'userId'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    auditLog: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    }
  }, {
    tableName: 'payments',
    underscored: true,
    paranoid: true,
    timestamps: true,
    indexes: [
      {
        fields: ['transactionId']
      },
      {
        fields: ['gatewayProvider']
      },
      {
        fields: ['paymentStatus']
      },
      {
        fields: ['gatewayTransactionId']
      },
      {
        fields: ['gatewayReference']
      },
      {
        fields: ['paymentMethod']
      },
      {
        fields: ['createdBy']
      },
      {
        fields: ['createdAt']
      }
    ],
    hooks: {
      beforeCreate: (payment) => {
        payment.initiatedAt = new Date();
      },
      beforeUpdate: (payment) => {
        const previousStatus = payment._previousDataValues?.paymentStatus;
        const currentStatus = payment.paymentStatus;
        
        if (previousStatus !== currentStatus) {
          switch (currentStatus) {
            case 'AUTHORIZED':
              payment.authorizedAt = new Date();
              break;
            case 'CAPTURED':
              payment.capturedAt = new Date();
              break;
            case 'SETTLED':
              payment.settledAt = new Date();
              break;
            case 'FAILED':
              payment.failedAt = new Date();
              break;
          }
        }

        // Update audit log
        if (!payment.auditLog) {
          payment.auditLog = [];
        }
        
        const auditEntry = {
          timestamp: new Date().toISOString(),
          status: currentStatus,
          previousStatus: previousStatus,
          updatedBy: payment.updatedBy || 'system'
        };
        
        payment.auditLog.push(auditEntry);
      }
    }
  });

  Payment.associate = (models) => {
    Payment.belongsTo(models.Transaction, {
      foreignKey: 'transactionId',
      as: 'transaction',
      onDelete: 'CASCADE'
    });

    Payment.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'createdByUser',
      onDelete: 'SET NULL'
    });

    Payment.belongsTo(models.User, {
      foreignKey: 'updatedBy',
      as: 'updatedByUser',
      onDelete: 'SET NULL'
    });
  };

  return Payment;
};
