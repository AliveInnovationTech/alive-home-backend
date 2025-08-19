"use strict";
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    service: process.env.EMAIL_SERVICE,
    port: 587,     // or 465 if secure
    secure: false, // true for 465, false for 587
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    tls: {
        rejectUnauthorized: true,
        minVersion: "TLSv1",
    },
});

module.exports = transporter;
