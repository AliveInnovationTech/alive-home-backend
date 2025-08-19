"use strict";
const { StatusCodes } = require("http-status-codes");
const { Op } = require("sequelize");
const { Transaction, Payment, UserSubscription, User, Property, SubscriptionPlan } = require("../models/");
const axios = require("axios");
const crypto = require("crypto");
const logger = require("../utils/logger");
const { handleServiceError, logInfo, logWarning } = require("../utils/errorHandler");

// Payment Gateway SDKs
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const paypal = require("@paypal/checkout-server-sdk");
const Razorpay = require("razorpay");
const Flutterwave = require("flutterwave-node-v3");
const Paystack = require("paystack")(process.env.PAYSTACK_SECRET_KEY);

// Initialize PayPal environment
const paypalEnvironment = process.env.PAYPAL_MODE === 'sandbox'
    ? new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET)
    : new paypal.core.LiveEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET);
const paypalClient = new paypal.core.PayPalHttpClient(paypalEnvironment);

// PayPal access token cache
let paypalAccessToken = null;
let paypalTokenExpiry = null;

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Initialize Flutterwave
const flutterwave = new Flutterwave(process.env.FLUTTERWAVE_PUBLIC_KEY, process.env.FLUTTERWAVE_SECRET_KEY);

/**
 * PayPal Access Token Management
 */
exports.getPayPalAccessToken = async () => {
    try {
        // Check if we have a valid cached token
        if (paypalAccessToken && paypalTokenExpiry && new Date() < paypalTokenExpiry) {
            return paypalAccessToken;
        }

        // Get new token
        const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
        const response = await axios.post(
            `${process.env.PAYPAL_MODE === 'live' ? 'https://api.paypal.com' : 'https://api.sandbox.paypal.com'}/v1/oauth2/token`,
            'grant_type=client_credentials',
            {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        paypalAccessToken = response.data.access_token;
        paypalTokenExpiry = new Date(Date.now() + (response.data.expires_in * 1000));

        return paypalAccessToken;
    } catch (error) {
        logger.error('Failed to get PayPal access token', { error: error.message, stack: error.stack });
        throw new Error('PayPal authentication failed');
    }
};

/**
 * Transaction Management Methods
 */
exports.createTransaction = async (transactionData, userId) => {
    try {
        // Validate required fields
        if (!transactionData.amount || !transactionData.currency || !transactionData.transactionType) {
            return {
                error: "Missing required fields: amount, currency, transactionType",
                statusCode: StatusCodes.BAD_REQUEST
            };
        }

        // Create transaction
        const transaction = await Transaction.create({
            userId: userId,
            amount: transactionData.amount,
            currency: transactionData.currency || process.env.PAYMENT_CURRENCY || 'USD',
            transactionType: transactionData.transactionType,
            status: 'PENDING',
            description: transactionData.description,
            propertyId: transactionData.propertyId,
            subscriptionId: transactionData.subscriptionId,
            commissionAmount: transactionData.commissionAmount || 0,
            commissionRecipientId: transactionData.commissionRecipientId,
            metadata: transactionData.metadata || {}
        });

        logInfo('Transaction created successfully', { transactionId: transaction.transactionId, userId, amount: transaction.amount });

        return {
            data: transaction,
            statusCode: StatusCodes.CREATED
        };

    } catch (e) {
        return handleServiceError('PaymentService', 'createTransaction', e, 'Error creating transaction');
    }
};

exports.processTransaction = async (transactionId, paymentData) => {
    try {
        const transaction = await Transaction.findByPk(transactionId);
        if (!transaction) {
            return {
                error: "Transaction not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        // Update transaction status to processing
        await transaction.update({ status: 'PROCESSING' });

        // Create payment record
        const payment = await Payment.create({
            transactionId: transactionId,
            amount: transaction.amount,
            currency: transaction.currency,
            paymentMethod: paymentData.paymentMethod,
            gatewayProvider: paymentData.gatewayProvider,
            paymentStatus: 'INITIATED',
            createdBy: paymentData.userId,
            metadata: paymentData.metadata || {}
        });

        // Process payment based on gateway
        const paymentResult = await this.processPayment(payment.paymentId, paymentData);

        logInfo('Transaction processed successfully', { transactionId: transaction.transactionId, status: transaction.status });

        return {
            data: {
                transaction: transaction,
                payment: payment,
                paymentResult: paymentResult
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        return handleServiceError('PaymentService', 'processTransaction', e, 'Error processing transaction');
    }
};

exports.updateTransactionStatus = async (transactionId, status, metadata = {}) => {
    try {
        const transaction = await Transaction.findByPk(transactionId);
        if (!transaction) {
            return {
                error: "Transaction not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        await transaction.update({
            status: status,
            metadata: { ...transaction.metadata, ...metadata }
        });

        logInfo('Transaction status updated', { transactionId, oldStatus: transaction.status, newStatus: status });

        return {
            data: transaction,
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        return handleServiceError('PaymentService', 'updateTransactionStatus', e, 'Error updating transaction status');
    }
};

exports.getTransactionById = async (transactionId) => {
    try {
        const transaction = await Transaction.findByPk(transactionId, {
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['userId', 'firstName', 'lastName', 'email']
                },
                {
                    model: Property,
                    as: 'property',
                    attributes: ['propertyId', 'title', 'address']
                },
                {
                    model: UserSubscription,
                    as: 'subscription',
                    attributes: ['subscriptionId', 'planName', 'status']
                },
                {
                    model: Payment,
                    as: 'payments',
                    attributes: ['paymentId', 'amount', 'paymentStatus', 'gatewayProvider', 'createdAt']
                }
            ]
        });

        if (!transaction) {
            return {
                error: "Transaction not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        logInfo('Transaction retrieved successfully', { transactionId });

        return {
            data: transaction,
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        return handleServiceError('PaymentService', 'getTransactionById', e, 'Error getting transaction');
    }
};

exports.getTransactionsByUser = async (userId, filters = {}) => {
    try {
        const whereClause = { userId };

        if (filters.status) whereClause.status = filters.status;
        if (filters.transactionType) whereClause.transactionType = filters.transactionType;
        if (filters.startDate) whereClause.createdAt = { [Op.gte]: filters.startDate };
        if (filters.endDate) whereClause.createdAt = { ...whereClause.createdAt, [Op.lte]: filters.endDate };

        // Validate and cap pagination parameters
        const limit = Math.min(Math.max(parseInt(filters.limit) || 50, 1), 1000);
        const offset = Math.max(parseInt(filters.offset) || 0, 0);

        const transactions = await Transaction.findAll({
            where: whereClause,
            include: [
                {
                    model: Property,
                    as: 'property',
                    attributes: ['propertyId', 'title']
                },
                {
                    model: Payment,
                    as: 'payments',
                    attributes: ['paymentId', 'paymentStatus', 'gatewayProvider']
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: limit,
            offset: offset
        });

        logInfo('User transactions retrieved successfully', { userId, totalTransactions: transactions.length });

        return {
            data: transactions,
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        return handleServiceError('PaymentService', 'getTransactionsByUser', e, 'Error getting user transactions');
    }
};

/**
 * Payment Processing Methods
 */
exports.initiatePayment = async (paymentData) => {
    try {
        // Validate payment data
        if (!paymentData.transactionId || !paymentData.amount || !paymentData.paymentMethod) {
            return {
                error: "Missing required payment fields",
                statusCode: StatusCodes.BAD_REQUEST
            };
        }

        // Prepare payment data
        const paymentDataToCreate = {
            transactionId: paymentData.transactionId,
            amount: paymentData.amount,
            currency: paymentData.currency || process.env.PAYMENT_CURRENCY || 'USD',
            paymentMethod: paymentData.paymentMethod,
            gatewayProvider: paymentData.gatewayProvider || 'CASH',
            paymentStatus: 'INITIATED',
            createdBy: paymentData.userId,
            metadata: paymentData.metadata || {}
        };

        // Add card fields only for card payment methods
        const cardMethods = ['CREDIT_CARD', 'DEBIT_CARD'];
        if (cardMethods.includes(paymentData.paymentMethod)) {
            paymentDataToCreate.cardLast4 = paymentData.cardLast4;
            paymentDataToCreate.cardBrand = paymentData.cardBrand;
            paymentDataToCreate.cardExpiryMonth = paymentData.cardExpiryMonth;
            paymentDataToCreate.cardExpiryYear = paymentData.cardExpiryYear;
        }

        // Add payment method details
        if (paymentData.paymentMethodDetails) {
            paymentDataToCreate.paymentMethodDetails = paymentData.paymentMethodDetails;
        }

        // Create payment record
        const payment = await Payment.create(paymentDataToCreate);

        // For non-cash providers, create gateway session/intent immediately
        if (payment.gatewayProvider !== 'CASH' && payment.gatewayProvider !== 'BANK_TRANSFER') {
            let gatewayResponse;

            try {
                switch (payment.gatewayProvider) {
                    case 'STRIPE':
                        gatewayResponse = await this.createStripePaymentIntent(payment, paymentData);
                        break;
                    case 'PAYPAL':
                        gatewayResponse = await this.createPayPalOrder(payment, paymentData);
                        break;
                    case 'PAYSTACK':
                        gatewayResponse = await this.initializePaystackTransaction(payment, paymentData);
                        break;
                    default:
                        // For other gateways, proceed without immediate session creation
                        break;
                }

                // Update payment with gateway IDs if available
                if (gatewayResponse) {
                    await payment.update({
                        gatewayTransactionId: gatewayResponse.gatewayTransactionId,
                        gatewayReference: gatewayResponse.gatewayReference,
                        gatewayResponse: { ...payment.gatewayResponse, initialResponse: gatewayResponse.response }
                    });
                }
            } catch (error) {
                logger.error(`Failed to create gateway session for ${payment.gatewayProvider}`, {
                    error: error.message,
                    stack: error.stack,
                    paymentId: payment.paymentId
                });
                // Continue with payment creation even if gateway session fails
            }
        }

        logInfo('Payment initiated successfully', { paymentId: payment.paymentId, gatewayProvider: payment.gatewayProvider });

        return {
            data: payment,
            statusCode: StatusCodes.CREATED
        };

    } catch (e) {
        return handleServiceError('PaymentService', 'initiatePayment', e, 'Error initiating payment');
    }
};

exports.processPayment = async (paymentId, paymentData) => {
    try {
        const payment = await Payment.findByPk(paymentId);
        if (!payment) {
            return {
                error: "Payment not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        // Update payment status to pending
        await payment.update({ paymentStatus: 'PENDING' });

        let gatewayResponse;

        // Process based on gateway provider
        switch (payment.gatewayProvider) {
            case 'STRIPE':
                gatewayResponse = await this.processStripePayment(payment, paymentData);
                break;
            case 'PAYPAL':
                gatewayResponse = await this.processPayPalPayment(payment, paymentData);
                break;
            case 'RAZORPAY':
                gatewayResponse = await this.processRazorpayPayment(payment, paymentData);
                break;
            case 'FLUTTERWAVE':
                gatewayResponse = await this.processFlutterwavePayment(payment, paymentData);
                break;
            case 'PAYSTACK':
                gatewayResponse = await this.processPaystackPayment(payment, paymentData);
                break;
            case 'CASH':
                gatewayResponse = await this.processCashPayment(payment, paymentData);
                break;
            default:
                throw new Error(`Unsupported payment gateway: ${payment.gatewayProvider}`);
        }

        // Update payment with gateway response
        await payment.update({
            gatewayTransactionId: gatewayResponse.gatewayTransactionId,
            paymentStatus: gatewayResponse.status,
            gatewayResponse: gatewayResponse.response,
            updatedBy: paymentData.userId
        });

        logInfo('Payment processed successfully', { paymentId: payment.paymentId, gatewayProvider: payment.gatewayProvider });

        return {
            data: {
                payment: payment,
                gatewayResponse: gatewayResponse
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        return handleServiceError('PaymentService', 'processPayment', e, 'Error processing payment');
    }
};

exports.capturePayment = async (paymentId, captureData = {}) => {
    try {
        const payment = await Payment.findByPk(paymentId);
        if (!payment) {
            return {
                error: "Payment not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        if (payment.paymentStatus !== 'AUTHORIZED') {
            return {
                error: "Payment must be authorized before capture",
                statusCode: StatusCodes.BAD_REQUEST
            };
        }

        let captureResponse;

        switch (payment.gatewayProvider) {
            case 'STRIPE':
                captureResponse = await this.captureStripePayment(payment, captureData);
                break;
            case 'PAYPAL':
                captureResponse = await this.capturePayPalPayment(payment, captureData);
                break;
            default:
                return {
                    error: `Capture not supported for ${payment.gatewayProvider}`,
                    statusCode: StatusCodes.BAD_REQUEST
                };
        }

        // Update payment status
        await payment.update({
            paymentStatus: 'CAPTURED',
            gatewayResponse: { ...payment.gatewayResponse, capture: captureResponse },
            updatedBy: captureData.userId
        });

        logInfo('Payment captured successfully', { paymentId, gatewayProvider: payment.gatewayProvider });

        return {
            data: {
                payment: payment,
                captureResponse: captureResponse
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        return handleServiceError('PaymentService', 'capturePayment', e, 'Error capturing payment');
    }
};

exports.refundPayment = async (paymentId, refundData) => {
    try {
        const payment = await Payment.findByPk(paymentId);
        if (!payment) {
            return {
                error: "Payment not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        if (!['CAPTURED', 'SETTLED'].includes(payment.paymentStatus)) {
            return {
                error: "Payment must be captured or settled before refund",
                statusCode: StatusCodes.BAD_REQUEST
            };
        }

        let refundResponse;

        switch (payment.gatewayProvider) {
            case 'STRIPE':
                refundResponse = await this.refundStripePayment(payment, refundData);
                break;
            case 'PAYPAL':
                refundResponse = await this.refundPayPalPayment(payment, refundData);
                break;
            case 'RAZORPAY':
                refundResponse = await this.refundRazorpayPayment(payment, refundData);
                break;
            default:
                return {
                    error: `Refund not supported for ${payment.gatewayProvider}`,
                    statusCode: StatusCodes.BAD_REQUEST
                };
        }

        // Update payment status
        await payment.update({
            paymentStatus: 'REFUNDED',
            gatewayResponse: { ...payment.gatewayResponse, refund: refundResponse },
            updatedBy: refundData.userId
        });

        logInfo('Payment refunded successfully', { paymentId, gatewayProvider: payment.gatewayProvider });
        return {
            data: {
                payment: payment,
                refundResponse: refundResponse
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        return handleServiceError('PaymentService', 'refundPayment', e, 'Error refunding payment');
    }
};

/**
 * Gateway Integration Methods
 */
exports.createStripePaymentIntent = async (payment, paymentData) => {
    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(payment.amount * 100), // Convert to cents
            currency: payment.currency.toLowerCase(),
            payment_method: paymentData.paymentMethodId,
            confirm: false,
            return_url: paymentData.returnUrl,
            metadata: {
                paymentId: payment.paymentId,
                transactionId: payment.transactionId
            }
        });

        return {
            gatewayTransactionId: paymentIntent.id,
            gatewayReference: paymentIntent.client_secret,
            status: 'PENDING',
            response: paymentIntent
        };
    } catch (error) {
        throw new Error(`Stripe payment intent creation failed: ${error.message}`);
    }
};

exports.createPayPalOrder = async (payment, paymentData) => {
    try {
        const request = new paypal.orders.OrdersCreateRequest();
        request.prefer("return=representation");
        request.requestBody({
            intent: 'CAPTURE',
            purchase_units: [{
                amount: {
                    currency_code: payment.currency,
                    value: payment.amount.toString()
                },
                custom_id: payment.paymentId
            }],
            application_context: {
                return_url: paymentData.returnUrl,
                cancel_url: paymentData.cancelUrl
            }
        });

        const order = await paypalClient.execute(request);

        return {
            gatewayTransactionId: order.result.id,
            gatewayReference: order.result.id,
            status: 'PENDING',
            response: order.result
        };
    } catch (error) {
        throw new Error(`PayPal order creation failed: ${error.message}`);
    }
};

exports.initializePaystackTransaction = async (payment, paymentData) => {
    try {
        const response = await Paystack.transaction.initialize({
            email: paymentData.customerEmail,
            amount: Math.round(payment.amount * 100), // Convert to kobo
            currency: payment.currency,
            reference: payment.paymentId,
            callback_url: paymentData.returnUrl,
            metadata: {
                paymentId: payment.paymentId,
                transactionId: payment.transactionId
            }
        });

        return {
            gatewayTransactionId: response.data.reference,
            gatewayReference: response.data.authorization_url,
            status: 'PENDING',
            response: response.data
        };
    } catch (error) {
        throw new Error(`Paystack transaction initialization failed: ${error.message}`);
    }
};

exports.processStripePayment = async (payment, paymentData) => {
    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(payment.amount * 100), // Convert to cents
            currency: payment.currency.toLowerCase(),
            payment_method: paymentData.paymentMethodId,
            confirm: true,
            return_url: paymentData.returnUrl,
            metadata: {
                paymentId: payment.paymentId,
                transactionId: payment.transactionId
            }
        });

        return {
            gatewayTransactionId: paymentIntent.id,
            status: paymentIntent.status === 'succeeded' ? 'CAPTURED' : 'PENDING',
            response: paymentIntent
        };

    } catch (error) {
        throw new Error(`Stripe payment failed: ${error.message}`);
    }
};

exports.processPayPalPayment = async (payment, paymentData) => {
    try {
        const request = new paypal.orders.OrdersCreateRequest();
        request.prefer("return=representation");
        request.requestBody({
            intent: 'CAPTURE',
            purchase_units: [{
                amount: {
                    currency_code: payment.currency,
                    value: payment.amount.toString()
                },
                custom_id: payment.paymentId
            }],
            application_context: {
                return_url: paymentData.returnUrl,
                cancel_url: paymentData.cancelUrl
            }
        });

        const order = await paypalClient.execute(request);

        return {
            gatewayTransactionId: order.result.id,
            status: 'PENDING',
            response: order.result
        };

    } catch (error) {
        throw new Error(`PayPal payment failed: ${error.message}`);
    }
};

exports.processRazorpayPayment = async (payment, paymentData) => {
    try {
        const order = await razorpay.orders.create({
            amount: Math.round(payment.amount * 100), // Convert to paise
            currency: payment.currency,
            receipt: payment.paymentId,
            notes: {
                paymentId: payment.paymentId,
                transactionId: payment.transactionId
            }
        });

        return {
            gatewayTransactionId: order.id,
            status: 'PENDING',
            response: order
        };

    } catch (error) {
        throw new Error(`Razorpay payment failed: ${error.message}`);
    }
};

exports.processFlutterwavePayment = async (payment, paymentData) => {
    try {
        const payload = {
            tx_ref: payment.paymentId,
            amount: payment.amount,
            currency: payment.currency,
            redirect_url: paymentData.returnUrl,
            customer: {
                email: paymentData.customerEmail,
                name: paymentData.customerName
            },
            customizations: {
                title: "Alive Home Payment",
                description: payment.metadata?.description || "Property payment"
            }
        };

        const response = await flutterwave.Charge.card(payload);

        return {
            gatewayTransactionId: response.data.flw_ref,
            status: response.data.status === 'successful' ? 'CAPTURED' : 'PENDING',
            response: response.data
        };

    } catch (error) {
        throw new Error(`Flutterwave payment failed: ${error.message}`);
    }
};

exports.processPaystackPayment = async (payment, paymentData) => {
    try {
        const response = await Paystack.transaction.initialize({
            email: paymentData.customerEmail,
            amount: Math.round(payment.amount * 100), // Convert to kobo
            currency: payment.currency,
            reference: payment.paymentId,
            callback_url: paymentData.returnUrl,
            metadata: {
                paymentId: payment.paymentId,
                transactionId: payment.transactionId
            }
        });

        return {
            gatewayTransactionId: response.data.reference,
            status: 'PENDING',
            response: response.data
        };

    } catch (error) {
        throw new Error(`Paystack payment failed: ${error.message}`);
    }
};

exports.processCashPayment = async (payment, paymentData) => {
    try {
        // Simulate cash payment processing
        await new Promise(resolve => setTimeout(resolve, 1000));

        return {
            gatewayTransactionId: `CASH_${payment.paymentId}`,
            status: 'CAPTURED',
            response: {
                method: 'CASH',
                status: 'completed',
                processedAt: new Date().toISOString()
            }
        };

    } catch (error) {
        throw new Error(`Cash payment failed: ${error.message}`);
    }
};

// Capture methods for different gateways
exports.captureStripePayment = async (payment, captureData) => {
    try {
        const paymentIntent = await stripe.paymentIntents.capture(payment.gatewayTransactionId, {
            amount: Math.round(payment.amount * 100)
        });

        return {
            captured: true,
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency,
            status: paymentIntent.status
        };

    } catch (error) {
        throw new Error(`Stripe capture failed: ${error.message}`);
    }
};

exports.capturePayPalPayment = async (payment, captureData) => {
    try {
        const request = new paypal.orders.OrdersCaptureRequest(payment.gatewayTransactionId);
        const capture = await paypalClient.execute(request);

        return {
            captured: true,
            amount: capture.result.purchase_units[0].payments.captures[0].amount.value,
            currency: capture.result.purchase_units[0].payments.captures[0].amount.currency_code,
            status: capture.result.status
        };

    } catch (error) {
        throw new Error(`PayPal capture failed: ${error.message}`);
    }
};

// Refund methods for different gateways
exports.refundStripePayment = async (payment, refundData) => {
    try {
        const refund = await stripe.refunds.create({
            payment_intent: payment.gatewayTransactionId,
            amount: Math.round((refundData.amount || payment.amount) * 100),
            reason: refundData.reason || 'requested_by_customer'
        });

        return {
            refunded: true,
            amount: refund.amount / 100,
            currency: refund.currency,
            status: refund.status
        };

    } catch (error) {
        throw new Error(`Stripe refund failed: ${error.message}`);
    }
};

exports.refundPayPalPayment = async (payment, refundData) => {
    try {
        const request = new paypal.payments.CapturesRefundRequest(payment.gatewayTransactionId);
        request.requestBody({
            amount: {
                value: (refundData.amount || payment.amount).toString(),
                currency_code: payment.currency
            }
        });

        const refund = await paypalClient.execute(request);

        return {
            refunded: true,
            amount: refund.result.amount.value,
            currency: refund.result.amount.currency_code,
            status: refund.result.status
        };

    } catch (error) {
        throw new Error(`PayPal refund failed: ${error.message}`);
    }
};

exports.refundRazorpayPayment = async (payment, refundData) => {
    try {
        const refund = await razorpay.payments.refund(payment.gatewayTransactionId, {
            amount: Math.round((refundData.amount || payment.amount) * 100),
            notes: {
                reason: refundData.reason || 'Customer request'
            }
        });

        return {
            refunded: true,
            amount: refund.amount / 100,
            currency: refund.currency,
            status: refund.status
        };

    } catch (error) {
        throw new Error(`Razorpay refund failed: ${error.message}`);
    }
};

/**
 * Subscription Billing Methods
 */
exports.processSubscriptionPayment = async (subscriptionId, paymentData) => {
    try {
        const subscription = await UserSubscription.findByPk(subscriptionId);
        if (!subscription) {
            return {
                error: "Subscription not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        // Fetch subscription with plan details
        const subscriptionWithPlan = await UserSubscription.findByPk(subscriptionId, {
            include: [{ model: SubscriptionPlan, as: 'plan' }]
        });

        if (!subscriptionWithPlan || !subscriptionWithPlan.plan) {
            return {
                error: "Subscription or plan not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        // Create transaction for subscription payment
        const transaction = await this.createTransaction({
            amount: subscriptionWithPlan.plan.price,
            currency: subscriptionWithPlan.plan.currency,
            transactionType: 'SUBSCRIPTION_PAYMENT',
            description: `Subscription payment for ${subscriptionWithPlan.plan.name}`,
            subscriptionId: subscriptionId,
            metadata: { planName: subscriptionWithPlan.plan.name }
        }, subscription.userId);

        if (transaction.error) {
            return transaction;
        }

        // Process the payment
        const paymentResult = await this.processTransaction(transaction.data.transactionId, {
            ...paymentData,
            userId: subscription.userId
        });

        return paymentResult;

    } catch (e) {
        console.error("Error processing subscription payment:", e);
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};

exports.handleRecurringBilling = async () => {
    try {
        // Find active subscriptions due for renewal
        const dueSubscriptions = await UserSubscription.findAll({
            where: {
                status: 'ACTIVE',
                nextBillingDate: {
                    [Op.lte]: new Date()
                }
            },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['userId', 'email', 'firstName', 'lastName']
                }
            ]
        });

        const results = [];

        for (const subscription of dueSubscriptions) {
            try {
                // Attempt to process payment using saved payment method
                const paymentResult = await this.processSubscriptionPayment(subscription.subscriptionId, {
                    paymentMethod: subscription.paymentMethod,
                    gatewayProvider: subscription.gatewayProvider,
                    userId: subscription.userId
                });

                if (paymentResult.statusCode === StatusCodes.OK) {
                    // Update subscription with next billing date
                    const subscriptionWithPlan = await UserSubscription.findByPk(subscription.subscriptionId, {
                        include: [{ model: SubscriptionPlan, as: 'plan' }]
                    });

                    if (subscriptionWithPlan && subscriptionWithPlan.plan) {
                        const nextBillingDate = new Date();
                        const cycleMonths = subscriptionWithPlan.plan.billingCycleMonths ||
                            (subscriptionWithPlan.plan.billingCycle === 'MONTHLY' ? 1 :
                                subscriptionWithPlan.plan.billingCycle === 'QUARTERLY' ? 3 : 12);
                        nextBillingDate.setMonth(nextBillingDate.getMonth() + cycleMonths);

                        await subscription.update({
                            nextBillingDate: nextBillingDate,
                            lastBillingDate: new Date()
                        });
                    }

                    results.push({
                        subscriptionId: subscription.subscriptionId,
                        status: 'success',
                        result: paymentResult
                    });
                } else {
                    // Handle failed payment
                    await subscription.update({
                        status: 'PAST_DUE',
                        failedPaymentCount: subscription.failedPaymentCount + 1
                    });

                    results.push({
                        subscriptionId: subscription.subscriptionId,
                        status: 'failed',
                        error: paymentResult.error
                    });
                }
            } catch (error) {
                console.error(`Error processing subscription ${subscription.subscriptionId}:`, error);
                results.push({
                    subscriptionId: subscription.subscriptionId,
                    status: 'error',
                    error: error.message
                });
            }
        }

        return {
            data: {
                processed: results.length,
                results: results
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        console.error("Error handling recurring billing:", e);
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};

/**
 * Webhook Handling Methods
 */
exports.processWebhook = async (gatewayProvider, rawBody, headers) => {
    try {
        // Validate webhook signature
        const isValid = await this.validateWebhookSignature(gatewayProvider, rawBody, headers);
        if (!isValid) {
            return {
                error: "Invalid webhook signature",
                statusCode: StatusCodes.UNAUTHORIZED
            };
        }

        // Parse webhook data
        const webhookData = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;

        let paymentUpdate;

        switch (gatewayProvider) {
            case 'STRIPE':
                paymentUpdate = await this.processStripeWebhook(webhookData);
                break;
            case 'PAYPAL':
                paymentUpdate = await this.processPayPalWebhook(webhookData);
                break;
            case 'RAZORPAY':
                paymentUpdate = await this.processRazorpayWebhook(webhookData);
                break;
            case 'FLUTTERWAVE':
                paymentUpdate = await this.processFlutterwaveWebhook(webhookData);
                break;
            case 'PAYSTACK':
                paymentUpdate = await this.processPaystackWebhook(webhookData);
                break;
            default:
                return {
                    error: `Unsupported gateway provider: ${gatewayProvider}`,
                    statusCode: StatusCodes.BAD_REQUEST
                };
        }

        logInfo('Webhook processed successfully', { gatewayProvider, webhookEventId: paymentUpdate.webhookEventId });

        return {
            data: paymentUpdate,
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        return handleServiceError('PaymentService', 'processWebhook', e, 'Error processing webhook');
    }
};

exports.validateWebhookSignature = async (gatewayProvider, rawBody, headers) => {
    try {
        switch (gatewayProvider) {
            case 'STRIPE':
                const stripeSignature = headers['stripe-signature'];
                if (!stripeSignature) {
                    logger.error("Missing Stripe signature header");
                    return false;
                }
                const stripeEvent = stripe.webhooks.constructEvent(
                    rawBody,
                    stripeSignature,
                    process.env.STRIPE_WEBHOOK_SECRET
                );
                return !!stripeEvent;

            case 'PAYPAL':
                // PayPal webhook validation using their API
                const paypalSignature = headers['paypal-transmission-sig'];
                const paypalTimestamp = headers['paypal-transmission-time'];
                const paypalWebhookId = headers['paypal-webhook-id'];

                if (!paypalSignature || !paypalTimestamp || !paypalWebhookId) {
                    logger.error("Missing PayPal signature headers");
                    return false;
                }

                // Verify using PayPal's verification API
                const verificationPayload = {
                    auth_algo: headers['paypal-auth-algo'],
                    cert_url: headers['paypal-cert-url'],
                    transmission_id: headers['paypal-transmission-id'],
                    transmission_sig: paypalSignature,
                    transmission_time: paypalTimestamp,
                    webhook_id: process.env.PAYPAL_WEBHOOK_ID,
                    webhook_event: typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody
                };

                const verificationResponse = await axios.post(
                    `${process.env.PAYPAL_MODE === 'live' ? 'https://api.paypal.com' : 'https://api.sandbox.paypal.com'}/v1/notifications/verify-webhook-signature`,
                    verificationPayload,
                    {
                        headers: {
                            'Authorization': `Bearer ${await this.getPayPalAccessToken()}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                return verificationResponse.data.verification_status === 'SUCCESS';

            case 'RAZORPAY':
                const razorpaySignature = headers['x-razorpay-signature'];
                if (!razorpaySignature) {
                    logger.error("Missing Razorpay signature header");
                    return false;
                }
                const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
                    .update(rawBody)
                    .digest('hex');
                return crypto.timingSafeEqual(
                    Buffer.from(razorpaySignature),
                    Buffer.from(expectedSignature)
                );

            case 'FLUTTERWAVE':
                const flutterwaveSignature = headers['verif-hash'];
                if (!flutterwaveSignature) {
                    logger.error("Missing Flutterwave signature header");
                    return false;
                }
                const expectedFlutterwaveSignature = crypto.createHmac('sha256', process.env.FLUTTERWAVE_ENCRYPTION_KEY)
                    .update(rawBody)
                    .digest('hex');
                return crypto.timingSafeEqual(
                    Buffer.from(flutterwaveSignature),
                    Buffer.from(expectedFlutterwaveSignature)
                );

            case 'PAYSTACK':
                const paystackSignature = headers['x-paystack-signature'];
                if (!paystackSignature) {
                    logger.error("Missing Paystack signature header");
                    return false;
                }
                const expectedPaystackSignature = crypto.createHmac('sha256', process.env.PAYSTACK_SECRET_KEY)
                    .update(rawBody)
                    .digest('hex');
                return crypto.timingSafeEqual(
                    Buffer.from(paystackSignature),
                    Buffer.from(expectedPaystackSignature)
                );

            default:
                logWarning(`No signature validation implemented for ${gatewayProvider}`);
                return true;
        }
    } catch (error) {
        logger.error("Webhook signature validation failed", { error: error.message, gatewayProvider });
        return false;
    }
};

// Webhook processing methods for different gateways
exports.processStripeWebhook = async (webhookData) => {
    try {
        const event = webhookData;

        switch (event.type) {
            case 'payment_intent.succeeded':
                const paymentIntent = event.data.object;
                return await this.updatePaymentFromWebhook(paymentIntent.metadata.paymentId, event);

            case 'payment_intent.payment_failed':
                const failedPayment = event.data.object;
                return await this.updatePaymentFromWebhook(failedPayment.metadata.paymentId, event);

            default:
                return { message: 'Event type not handled', eventType: event.type };
        }
    } catch (error) {
        throw new Error(`Stripe webhook processing failed: ${error.message}`);
    }
};

exports.processPayPalWebhook = async (webhookData) => {
    try {
        const event = webhookData;

        switch (event.event_type) {
            case 'PAYMENT.CAPTURE.COMPLETED':
                const capture = event.resource;
                return await this.updatePaymentFromWebhook(capture.custom_id, event);

            case 'PAYMENT.CAPTURE.DENIED':
                const deniedCapture = event.resource;
                return await this.updatePaymentFromWebhook(deniedCapture.custom_id, event);

            default:
                return { message: 'Event type not handled', eventType: event.event_type };
        }
    } catch (error) {
        throw new Error(`PayPal webhook processing failed: ${error.message}`);
    }
};

exports.processRazorpayWebhook = async (webhookData) => {
    try {
        const event = webhookData;

        switch (event.event) {
            case 'payment.captured':
                const payment = event.payload.payment.entity;
                return await this.updatePaymentFromWebhook(payment.notes.paymentId, event);

            case 'payment.failed':
                const failedPayment = event.payload.payment.entity;
                return await this.updatePaymentFromWebhook(failedPayment.notes.paymentId, event);

            default:
                return { message: 'Event type not handled', eventType: event.event };
        }
    } catch (error) {
        throw new Error(`Razorpay webhook processing failed: ${error.message}`);
    }
};

exports.processFlutterwaveWebhook = async (webhookData) => {
    try {
        const event = webhookData;

        if (event.status === 'successful') {
            return await this.updatePaymentFromWebhook(event.tx_ref, event);
        } else if (event.status === 'failed') {
            return await this.updatePaymentFromWebhook(event.tx_ref, event);
        }

        return { message: 'Event status not handled', status: event.status };
    } catch (error) {
        throw new Error(`Flutterwave webhook processing failed: ${error.message}`);
    }
};

exports.processPaystackWebhook = async (webhookData) => {
    try {
        const event = webhookData;

        if (event.status === 'success') {
            return await this.updatePaymentFromWebhook(event.data.reference, event);
        } else if (event.status === 'failed') {
            return await this.updatePaymentFromWebhook(event.data.reference, event);
        }

        return { message: 'Event status not handled', status: event.status };
    } catch (error) {
        throw new Error(`Paystack webhook processing failed: ${error.message}`);
    }
};

exports.updatePaymentFromWebhook = async (paymentId, webhookData) => {
    try {
        const payment = await Payment.findByPk(paymentId);
        if (!payment) {
            throw new Error("Payment not found");
        }

        // Check for idempotency - avoid processing duplicate webhooks
        const webhookEventId = webhookData.id || webhookData.event_id || webhookData.transaction_id;
        if (webhookEventId && payment.gatewayResponse?.processedWebhooks?.includes(webhookEventId)) {
            console.log(`Webhook event ${webhookEventId} already processed for payment ${paymentId}`);
            return {
                data: payment,
                statusCode: StatusCodes.OK,
                message: 'Webhook already processed'
            };
        }

        // Update payment status based on webhook data
        const newStatus = this.mapWebhookStatusToPaymentStatus(payment.gatewayProvider, webhookData);

        // Sanitize webhook data before storing (remove sensitive information)
        const sanitizedWebhookData = this.sanitizeWebhookData(webhookData);

        await payment.update({
            paymentStatus: newStatus,
            gatewayResponse: {
                ...payment.gatewayResponse,
                webhook: sanitizedWebhookData,
                processedWebhooks: [...(payment.gatewayResponse?.processedWebhooks || []), webhookEventId].filter(Boolean)
            },
            webhookReceived: true,
            webhookProcessedAt: new Date(),
            webhookAttempts: payment.webhookAttempts + 1,
            updatedAt: new Date()
        });

        // Update associated transaction if payment is completed
        if (['CAPTURED', 'SETTLED'].includes(newStatus)) {
            await this.updateTransactionStatus(payment.transactionId, 'COMPLETED', {
                completedAt: new Date(),
                webhookSource: payment.gatewayProvider
            });
        }

        return {
            data: payment,
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        console.error("Error updating payment from webhook:", e);
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};

/**
 * Commission Processing Methods
 */
exports.calculateCommission = async (transactionId, commissionData) => {
    try {
        const transaction = await Transaction.findByPk(transactionId);
        if (!transaction) {
            return {
                error: "Transaction not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        // Calculate commission based on transaction type and amount
        let commissionAmount = 0;
        let commissionRate = 0;

        switch (transaction.transactionType) {
            case 'PROPERTY_PURCHASE':
                commissionRate = commissionData.rate || 0.05; // 5% default
                break;
            case 'SUBSCRIPTION_PAYMENT':
                commissionRate = commissionData.rate || 0.02; // 2% default
                break;
            case 'COMMISSION_PAYMENT':
                commissionRate = commissionData.rate || 0.10; // 10% default
                break;
            default:
                commissionRate = commissionData.rate || 0.03; // 3% default
        }

        commissionAmount = transaction.amount * commissionRate;

        // Update transaction with commission details
        await transaction.update({
            commissionAmount: commissionAmount,
            commissionRate: commissionRate,
            commissionRecipientId: commissionData.recipientId
        });

        return {
            data: {
                transaction: transaction,
                commissionAmount: commissionAmount,
                commissionRate: commissionRate
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        console.error("Error calculating commission:", e);
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};

exports.processCommissionPayment = async (transactionId, commissionPaymentData) => {
    try {
        const transaction = await Transaction.findByPk(transactionId);
        if (!transaction) {
            return {
                error: "Transaction not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        if (!transaction.commissionAmount || transaction.commissionAmount <= 0) {
            return {
                error: "No commission to process",
                statusCode: StatusCodes.BAD_REQUEST
            };
        }

        // Create commission transaction
        const commissionTransaction = await this.createTransaction({
            amount: transaction.commissionAmount,
            currency: transaction.currency,
            transactionType: 'COMMISSION_PAYMENT',
            description: `Commission payment for transaction ${transactionId}`,
            parentTransactionId: transactionId,
            metadata: {
                originalTransactionId: transactionId,
                commissionType: 'SALE_COMMISSION'
            }
        }, transaction.commissionRecipientId);

        if (commissionTransaction.error) {
            return commissionTransaction;
        }

        // Process commission payment
        const paymentResult = await this.processTransaction(
            commissionTransaction.data.transactionId,
            {
                paymentMethod: 'BANK_TRANSFER',
                gatewayProvider: 'CASH',
                userId: transaction.commissionRecipientId
            }
        );

        return paymentResult;

    } catch (e) {
        console.error("Error processing commission payment:", e);
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};

/**
 * Reporting and Analytics Methods
 */
exports.getPaymentStats = async (filters = {}) => {
    try {
        const whereClause = {};

        if (filters.startDate) whereClause.createdAt = { [Op.gte]: filters.startDate };
        if (filters.endDate) whereClause.createdAt = { ...whereClause.createdAt, [Op.lte]: filters.endDate };
        if (filters.gatewayProvider) whereClause.gatewayProvider = filters.gatewayProvider;
        if (filters.paymentStatus) whereClause.paymentStatus = filters.paymentStatus;

        const stats = await Payment.findAll({
            where: whereClause,
            attributes: [
                'gatewayProvider',
                'paymentStatus',
                [Payment.sequelize.fn('COUNT', Payment.sequelize.col('paymentId')), 'count'],
                [Payment.sequelize.fn('SUM', Payment.sequelize.col('amount')), 'totalAmount'],
                [Payment.sequelize.fn('AVG', Payment.sequelize.col('amount')), 'averageAmount']
            ],
            group: ['gatewayProvider', 'paymentStatus'],
            raw: true
        });

        return {
            data: stats,
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        console.error("Error getting payment stats:", e);
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};

exports.getTransactionHistory = async (filters = {}) => {
    try {
        const whereClause = {};

        if (filters.userId) whereClause.userId = filters.userId;
        if (filters.status) whereClause.status = filters.status;
        if (filters.transactionType) whereClause.transactionType = filters.transactionType;
        if (filters.startDate) whereClause.createdAt = { [Op.gte]: filters.startDate };
        if (filters.endDate) whereClause.createdAt = { ...whereClause.createdAt, [Op.lte]: filters.endDate };

        // Validate and cap pagination parameters
        const limit = Math.min(Math.max(parseInt(filters.limit) || 100, 1), 1000);
        const offset = Math.max(parseInt(filters.offset) || 0, 0);

        const transactions = await Transaction.findAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['userId', 'firstName', 'lastName', 'email']
                },
                {
                    model: Payment,
                    as: 'payments',
                    attributes: ['paymentId', 'paymentStatus', 'gatewayProvider', 'createdAt']
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: limit,
            offset: offset
        });

        return {
            data: transactions,
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        console.error("Error getting transaction history:", e);
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};

exports.generatePaymentReport = async (reportParams) => {
    try {
        const { startDate, endDate, format = 'json', includeDetails = false } = reportParams;

        const whereClause = {};
        if (startDate) whereClause.createdAt = { [Op.gte]: startDate };
        if (endDate) whereClause.createdAt = { ...whereClause.createdAt, [Op.lte]: endDate };

        const payments = await Payment.findAll({
            where: whereClause,
            include: includeDetails ? [
                {
                    model: Transaction,
                    as: 'transaction',
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: ['userId', 'firstName', 'lastName', 'email']
                        }
                    ]
                }
            ] : [],
            order: [['createdAt', 'DESC']]
        });

        const report = {
            period: { startDate, endDate },
            summary: {
                totalPayments: payments.length,
                totalAmount: payments.reduce((sum, p) => sum + Number(p.amount || 0), 0),
                successfulPayments: payments.filter(p => ['CAPTURED', 'SETTLED'].includes(p.paymentStatus)).length,
                failedPayments: payments.filter(p => ['FAILED', 'CANCELLED'].includes(p.paymentStatus)).length
            },
            gatewayBreakdown: {},
            payments: includeDetails ? payments : undefined
        };

        // Calculate gateway breakdown
        payments.forEach(payment => {
            const gateway = payment.gatewayProvider;
            if (!report.gatewayBreakdown[gateway]) {
                report.gatewayBreakdown[gateway] = {
                    count: 0,
                    amount: 0,
                    successRate: 0
                };
            }
            report.gatewayBreakdown[gateway].count++;
            report.gatewayBreakdown[gateway].amount += Number(payment.amount || 0);
        });

        // Calculate success rates
        Object.keys(report.gatewayBreakdown).forEach(gateway => {
            const gatewayPayments = payments.filter(p => p.gatewayProvider === gateway);
            const successful = gatewayPayments.filter(p => ['CAPTURED', 'SETTLED'].includes(p.paymentStatus)).length;
            report.gatewayBreakdown[gateway].successRate = (successful / gatewayPayments.length) * 100;
        });

        return {
            data: report,
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        console.error("Error generating payment report:", e);
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};

/**
 * Helper Methods
 */
exports.sanitizeWebhookData = (webhookData) => {
    try {
        const sanitized = JSON.parse(JSON.stringify(webhookData));

        // Remove sensitive fields that might be present in webhook data
        const sensitiveFields = [
            'card_number', 'cardNumber', 'cvv', 'cvc', 'security_code',
            'password', 'secret', 'token', 'key', 'authorization',
            'account_number', 'routing_number', 'ssn', 'sin'
        ];

        const removeSensitiveData = (obj) => {
            if (typeof obj !== 'object' || obj === null) return obj;

            for (const key in obj) {
                if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
                    obj[key] = '[REDACTED]';
                } else if (typeof obj[key] === 'object') {
                    removeSensitiveData(obj[key]);
                }
            }
        };

        removeSensitiveData(sanitized);
        return sanitized;
    } catch (error) {
        console.error('Error sanitizing webhook data:', error);
        return { error: 'Failed to sanitize webhook data' };
    }
};

exports.mapWebhookStatusToPaymentStatus = (gatewayProvider, webhookData) => {
    switch (gatewayProvider) {
        case 'STRIPE':
            switch (webhookData.type) {
                case 'payment_intent.succeeded':
                    return 'CAPTURED';
                case 'payment_intent.payment_failed':
                    return 'FAILED';
                case 'payment_intent.canceled':
                    return 'CANCELLED';
                default:
                    return 'PENDING';
            }

        case 'PAYPAL':
            switch (webhookData.event_type) {
                case 'PAYMENT.CAPTURE.COMPLETED':
                    return 'CAPTURED';
                case 'PAYMENT.CAPTURE.DENIED':
                    return 'FAILED';
                case 'PAYMENT.CAPTURE.CANCELED':
                    return 'CANCELLED';
                default:
                    return 'PENDING';
            }

        case 'RAZORPAY':
            switch (webhookData.event) {
                case 'payment.captured':
                    return 'CAPTURED';
                case 'payment.failed':
                    return 'FAILED';
                default:
                    return 'PENDING';
            }

        default:
            return 'PENDING';
    }
};

exports._helpers = {
    mapWebhookStatusToPaymentStatus: this.mapWebhookStatusToPaymentStatus,
    sanitizeWebhookData: this.sanitizeWebhookData
};
