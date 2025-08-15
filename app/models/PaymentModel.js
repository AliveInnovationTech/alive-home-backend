"use strict";
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Payment extends Model {
    static associate(models) {
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
    }

    validateStatusTransitions() {
      const allowedTransitions = {
        'INITIATED': ['PENDING', 'FAILED', 'CANCELLED'],
        'PENDING': ['AUTHORIZED', 'FAILED', 'CANCELLED'],
        'AUTHORIZED': ['CAPTURED', 'FAILED', 'CANCELLED'],
        'CAPTURED': ['SETTLED', 'REFUNDED'],
        'SETTLED': ['REFUNDED'],
        'FAILED': ['PENDING'],
        'CANCELLED': [],
        'REFUNDED': []
      };

      const previousStatus = this._previousDataValues?.paymentStatus || 'INITIATED';
      const currentStatus = this.paymentStatus;

      if (!allowedTransitions[previousStatus]?.includes(currentStatus)) {
        throw new Error(`Invalid payment status transition from ${previousStatus} to ${currentStatus}`);
      }
    }

    validateCardExpiryYear() {
      if (this.cardExpiryYear) {
        const currentYear = new Date().getFullYear();
        if (this.cardExpiryYear < currentYear || this.cardExpiryYear > currentYear + 20) {
          throw new Error('Card expiry year must be between current year and 20 years from now');
        }
      }
    }

    validatePaymentMethod() {
      const cardMethods = ['CREDIT_CARD', 'DEBIT_CARD'];
      const cashMethods = ['CASH', 'BANK_TRANSFER'];
      const digitalMethods = ['DIGITAL_WALLET'];

      // Card-specific validations
      if (cardMethods.includes(this.paymentMethod)) {
        if (!this.cardLast4 || !this.cardBrand || !this.cardExpiryMonth || !this.cardExpiryYear) {
          throw new Error('Card details are required for card payment methods');
        }
      }

      // Cash/bank transfer validations
      if (cashMethods.includes(this.paymentMethod)) {
        if (this.cardLast4 || this.cardBrand || this.cardExpiryMonth || this.cardExpiryYear) {
          throw new Error('Card details should not be set for cash/bank transfer methods');
        }
      }

      // Gateway-specific validations
      const requiresGatewayId = ['STRIPE', 'PAYPAL', 'RAZORPAY', 'FLUTTERWAVE', 'PAYSTACK'];
      if (requiresGatewayId.includes(this.gatewayProvider)) {
        if (!this.gatewayTransactionId) {
          throw new Error('Gateway transaction ID is required for non-cash providers');
        }
      }

      // Advanced statuses require gateway info
      const advancedStatuses = ['AUTHORIZED', 'CAPTURED', 'SETTLED'];
      if (advancedStatuses.includes(this.paymentStatus) && this.gatewayProvider !== 'CASH') {
        if (!this.gatewayTransactionId) {
          throw new Error('Gateway transaction ID is required for advanced payment statuses');
        }
      }
    }
  }

  Payment.init({
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
        key: 'transaction_id'
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
      allowNull: true
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
        key: 'user_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    auditLog: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: () => []
    }
  }, {
    sequelize,
    tableName: 'payments',
    underscored: true,
    paranoid: true,
    timestamps: true,
    indexes: [
      {
        fields: ['transaction_id']
      },
      {
        fields: ['gateway_provider']
      },
      {
        fields: ['payment_status']
      },
      {
        fields: ['gateway_transaction_id']
      },
      {
        fields: ['gateway_reference']
      },
      {
        fields: ['payment_method']
      },
      {
        fields: ['created_by']
      },
      {
        fields: ['created_at']
      }
    ],
    hooks: {
      beforeCreate: (payment) => {
        payment.initiatedAt = new Date();
        
        // Set timestamps based on initial status
        if (payment.paymentStatus === 'AUTHORIZED') {
          payment.authorizedAt = new Date();
        } else if (payment.paymentStatus === 'CAPTURED') {
          payment.authorizedAt = new Date();
          payment.capturedAt = new Date();
        } else if (payment.paymentStatus === 'SETTLED') {
          payment.authorizedAt = new Date();
          payment.capturedAt = new Date();
          payment.settledAt = new Date();
        } else if (payment.paymentStatus === 'FAILED') {
          payment.failedAt = new Date();
        }

        // Add initial audit log entry
        const auditEntry = {
          timestamp: new Date().toISOString(),
          status: payment.paymentStatus,
          previousStatus: null,
          updatedBy: payment.createdBy || 'system'
        };
        payment.auditLog = [auditEntry];
      },
      beforeUpdate: (payment) => {
        // Validate status transitions
        payment.validateStatusTransitions();
        
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
        const auditEntry = {
          timestamp: new Date().toISOString(),
          status: currentStatus,
          previousStatus: previousStatus,
          updatedBy: payment.updatedBy || 'system'
        };
        
        payment.set('auditLog', [...(payment.auditLog || []), auditEntry]);
      },
      beforeSave: (payment) => {
        // Set timestamps based on initial status on create
        if (payment.isNewRecord) {
          if (payment.paymentStatus === 'AUTHORIZED') {
            payment.authorizedAt = new Date();
          } else if (payment.paymentStatus === 'CAPTURED') {
            payment.authorizedAt = new Date();
            payment.capturedAt = new Date();
          } else if (payment.paymentStatus === 'SETTLED') {
            payment.authorizedAt = new Date();
            payment.capturedAt = new Date();
            payment.settledAt = new Date();
          } else if (payment.paymentStatus === 'FAILED') {
            payment.failedAt = new Date();
          }
        }
      }
    },
    validate: {
      validateCardExpiryYear() {
        this.validateCardExpiryYear();
      },
      validatePaymentMethod() {
        this.validatePaymentMethod();
      }
    }
  });

  return Payment;
};

