"use strict";
const { StatusCodes } = require("http-status-codes");
const transporter = require("../utils/emailConfig"); // Nodemailer transporter instance
const pushService = require("../utils/pushService");
const sequelize = require("../../lib/database")
const path = require("path");
const ejs = require("ejs");
const fs = require("fs");

/**
 * Send an email notification with EJS template support
 * @param {string} recipientEmail - Email address of recipient
 * @param {string} subject - Email subject
 * @param {string} templateName - Name of the EJS template file (without extension)
 * @param {Object} templateData - Data to pass into the template
 * 
 */

const getModels = () => {
    if (!sequelize.models.Notification) {
        throw new Error('Models not loaded yet');
    }
    return {
        User: sequelize.models.User,
        Notification: sequelize.models.Notification
    };
};
exports.sendEmailNotification = async (recipientEmail, subject, templateName, templateData = {}) => {
    try {
        const templatePath = path.join(__dirname, "..", "templates", `${templateName}.html`);

        const htmlContent = await ejs.renderFile(templatePath, templateData);

        const mailOptions = {
            from: transporter.options.auth.user,
            to: recipientEmail,
            subject,
            html: htmlContent
        };
        const { Notification } = getModels()
        // Send email
        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent: " + info.response);

        // Save notification record
        await Notification.create({
            recipientId: recipientEmail,
            type: "EMAIL",
            subject,
            content: "",
            html: htmlContent,
            status: "SENT"
        });

        return {
            statusCode: StatusCodes.OK,
            message: "Email notification sent successfully"
        };
    } catch (error) {
        console.error("Error sending email: ", error);

        await Notification.create({
            recipientId: recipientEmail,
            type: "EMAIL",
            subject,
            content: "",
            status: "FAILED"
        });

        return {
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
            message: "Failed to send email notification"
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
        console.error("Error sending push notification: ", error);

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
    
     const {Notification} =getModels()
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
