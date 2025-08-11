"use strict"
const nodemailer = require("nodemailer");

const nodeMailerConfig = async (receiverEmail, subject, text, html, attachments) => {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            service: process.env.EMAIL_SERVICE,
            port: process.env.EMAIL_PORT,
            secure: false, //Security can either be FALSE OR TRUE

            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
            tls: {
                rejectUnauthorized: true,
                minVersion: 'TLSv1'
            },
        });
        await transporter.sendMail({
            from: 'AliveHome <aliveinnovationtech@gmail.com>',
            to: receiverEmail,
            subject: subject,
            text:text,
            html: html,
            attachments:attachments
        });
        console.log("email sent successfully");
    } catch (error) {
        console.log("email not sent" +error);
    }
};
module.exports = nodeMailerConfig;