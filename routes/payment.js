"use strict";

const express = require("express");
const router = express.Router();
const PaymentService = require("../app/services/PaymentService");
const { StatusCodes } = require("http-status-codes");
const logger = require("../app/utils/logger");

router.post("/webhooks/stripe", async (req, res) => {
    try {
        const rawBody = req.body.toString();
        const result = await PaymentService.processWebhook('STRIPE', rawBody, req.headers);
        
        if (result.statusCode === StatusCodes.OK) {
            res.status(StatusCodes.OK).json({ received: true });
        } else {
            res.status(result.statusCode).json({ error: result.error });
        }
    } catch (error) {
        logger.error("Stripe webhook processing failed", { error: error.message, stack: error.stack });
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Webhook processing failed" });
    }
});

router.post("/webhooks/paypal", async (req, res) => {
    try {
        const rawBody = req.body.toString();
        const result = await PaymentService.processWebhook('PAYPAL', rawBody, req.headers);
        
        if (result.statusCode === StatusCodes.OK) {
            res.status(StatusCodes.OK).json({ received: true });
        } else {
            res.status(result.statusCode).json({ error: result.error });
        }
    } catch (error) {
        logger.error("PayPal webhook processing failed", { error: error.message, stack: error.stack });
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Webhook processing failed" });
    }
});

router.post("/webhooks/razorpay", async (req, res) => {
    try {
        const rawBody = req.body.toString();
        const result = await PaymentService.processWebhook('RAZORPAY', rawBody, req.headers);
        
        if (result.statusCode === StatusCodes.OK) {
            res.status(StatusCodes.OK).json({ received: true });
        } else {
            res.status(result.statusCode).json({ error: result.error });
        }
    } catch (error) {
        logger.error("Razorpay webhook processing failed", { error: error.message, stack: error.stack });
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Webhook processing failed" });
    }
});

router.post("/webhooks/flutterwave", async (req, res) => {
    try {
        const rawBody = req.body.toString();
        const result = await PaymentService.processWebhook('FLUTTERWAVE', rawBody, req.headers);
        
        if (result.statusCode === StatusCodes.OK) {
            res.status(StatusCodes.OK).json({ received: true });
        } else {
            res.status(result.statusCode).json({ error: result.error });
        }
    } catch (error) {
        logger.error("Flutterwave webhook processing failed", { error: error.message, stack: error.stack });
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Webhook processing failed" });
    }
});

router.post("/webhooks/paystack", async (req, res) => {
    try {
        const rawBody = req.body.toString();
        const result = await PaymentService.processWebhook('PAYSTACK', rawBody, req.headers);
        
        if (result.statusCode === StatusCodes.OK) {
            res.status(StatusCodes.OK).json({ received: true });
        } else {
            res.status(result.statusCode).json({ error: result.error });
        }
    } catch (error) {
        logger.error("Paystack webhook processing failed", { error: error.message, stack: error.stack });
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Webhook processing failed" });
    }
});

// Payment processing endpoints
router.post("/initiate", async (req, res) => {
    try {
        const result = await PaymentService.initiatePayment(req.body);
        res.status(result.statusCode).json(result);
    } catch (error) {
        logger.error("Payment initiation failed", { error: error.message, stack: error.stack });
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Payment initiation failed" });
    }
});

router.post("/process/:paymentId", async (req, res) => {
    try {
        const result = await PaymentService.processPayment(req.params.paymentId, req.body);
        res.status(result.statusCode).json(result);
    } catch (error) {
        logger.error("Payment processing failed", { error: error.message, stack: error.stack, paymentId: req.params.paymentId });
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Payment processing failed" });
    }
});

router.post("/capture/:paymentId", async (req, res) => {
    try {
        const result = await PaymentService.capturePayment(req.params.paymentId, req.body);
        res.status(result.statusCode).json(result);
    } catch (error) {
        logger.error("Payment capture failed", { error: error.message, stack: error.stack, paymentId: req.params.paymentId });
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Payment capture failed" });
    }
});

router.post("/refund/:paymentId", async (req, res) => {
    try {
        const result = await PaymentService.refundPayment(req.params.paymentId, req.body);
        res.status(result.statusCode).json(result);
    } catch (error) {
        logger.error("Payment refund failed", { error: error.message, stack: error.stack, paymentId: req.params.paymentId });
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Payment refund failed" });
    }
});

// Transaction endpoints
router.post("/transactions", async (req, res) => {
    try {
        const result = await PaymentService.createTransaction(req.body, req.user?.userId);
        res.status(result.statusCode).json(result);
    } catch (error) {
        logger.error("Transaction creation failed", { error: error.message, stack: error.stack });
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Transaction creation failed" });
    }
});

router.get("/transactions/:transactionId", async (req, res) => {
    try {
        const result = await PaymentService.getTransactionById(req.params.transactionId);
        res.status(result.statusCode).json(result);
    } catch (error) {
        logger.error("Transaction retrieval failed", { error: error.message, stack: error.stack, transactionId: req.params.transactionId });
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Transaction retrieval failed" });
    }
});

router.get("/transactions", async (req, res) => {
    try {
        const result = await PaymentService.getTransactionsByUser(req.user?.userId, req.query);
        res.status(result.statusCode).json(result);
    } catch (error) {
        logger.error("User transactions retrieval failed", { error: error.message, stack: error.stack, userId: req.user?.userId });
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "User transactions retrieval failed" });
    }
});

// Subscription billing endpoints
router.post("/subscriptions/:subscriptionId/process", async (req, res) => {
    try {
        const result = await PaymentService.processSubscriptionPayment(req.params.subscriptionId, req.body);
        res.status(result.statusCode).json(result);
    } catch (error) {
        logger.error("Subscription payment failed", { error: error.message, stack: error.stack, subscriptionId: req.params.subscriptionId });
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Subscription payment failed" });
    }
});

// Reporting endpoints
router.get("/stats", async (req, res) => {
    try {
        const result = await PaymentService.getPaymentStats(req.query);
        res.status(result.statusCode).json(result);
    } catch (error) {
        logger.error("Payment stats retrieval failed", { error: error.message, stack: error.stack });
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Payment stats retrieval failed" });
    }
});

router.get("/history", async (req, res) => {
    try {
        const result = await PaymentService.getTransactionHistory(req.query);
        res.status(result.statusCode).json(result);
    } catch (error) {
        logger.error("Transaction history retrieval failed", { error: error.message, stack: error.stack });
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Transaction history retrieval failed" });
    }
});

router.post("/reports", async (req, res) => {
    try {
        const result = await PaymentService.generatePaymentReport(req.body);
        res.status(result.statusCode).json(result);
    } catch (error) {
        logger.error("Payment report generation failed", { error: error.message, stack: error.stack });
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Payment report generation failed" });
    }
});

module.exports = router;
