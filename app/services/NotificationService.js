"use strict";
const pushService = require("../utils/pushService");
const { StatusCodes } = require("http-status-codes");
const transporter = require("../utils/emailConfig");
const sequelize = require("../../lib/database");
const path = require("path");
const ejs = require("ejs");
const logger = require("../utils/logger");
const { logInfo } = require("../utils/errorHandler");

const getModels = () => {
    if (!sequelize.models.Notification) {
        throw new Error("Models not loaded yet");
    }
    return {
        User: sequelize.models.User,
        Notification: sequelize.models.Notification,
    };
};

/**
 * Send an email notification with EJS template support
 * @param {Object} data - Object containing recipient details (email, name, etc.)
 * @param {string} templateName - Name of the EJS template file (without extension)
 * @param {string} subject - Email subject
 * @param {Object} templateData - Data to pass into the template
 */
exports.sendEmailNotification = async (
    data,
    templateName,
    subject,
    templateData = {}
) => {
    const { Notification } = getModels();
    const { userId, email } = data;

    try {
        const templatePath = path.join(__dirname, "../templates", `${templateName}.html`);
        const htmlContent = await ejs.renderFile(templatePath, { ...data, ...templateData });

        const mailOptions = {
            from: `AliveHome <${process.env.EMAIL_USER}>`,
            to: email,
            subject,
            html: htmlContent,
        };

        const info = await transporter.sendMail(mailOptions);
        logInfo("Email sent successfully", { email, subject, response: info.response });

        await Notification.create({
            recipientId: userId,
            type: "EMAIL",
            subject,
            content: templateData?.text || `Notification sent to ${email}`,
            html: htmlContent,
            status: "SENT",
        });

        return {
            statusCode: StatusCodes.OK,
            message: "Email notification sent successfully",
        };
    } catch (error) {
        logger.error("Error sending email", { email, subject, error: error.message });

        const { Notification } = getModels();

        await Notification.create({
            recipientId: data.userId || null,
            type: "EMAIL",
            subject,
            content: "Email failed to send",
            status: "FAILED",
        });

        return {
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
            message: "Failed to send email notification",
        };
    }
};

exports.sendPushNotification = async (recipientId, title, message) => {
    try {
        const response = await pushService.sendPushNotification({
            recipientId,
            title,
            message
        });
        const { Notification } = getModels()

        if (response.success) {
            await Notification.create({
                recipientId,
                type: "PUSH",
                subject: title,
                content: message,
                status: "SENT"
            });

            return {
                statusCode: StatusCodes.OK,
                message: "Push notification sent successfully"
            };
        } else {
            throw new Error("Push notification failed");
        }
    } catch (error) {
        logger.error("Error sending push notification", { recipientId, title, message, error: error.message });

        await Notification.create({
            recipientId,
            type: "PUSH",
            subject: title,
            content: message,
            status: "FAILED"
        });

        return {
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
            message: "Failed to send push notification"
        };
    }
};

exports.getNotifications = async (recipientId) => {

    const { Notification } = getModels()
    try {
        const notifications = await Notification.find({ recipientId });
        return {
            statusCode: StatusCodes.OK,
            data: notifications
        };
    } catch (e) {
        console.log("An error occurred while fetching notifications: ", e);
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};
