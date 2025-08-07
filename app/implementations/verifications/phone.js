"use strict";
const { formatPhoneNumber } = require("tm-utils");
const Joi = require("joi");
const randomString = require("crypto-random-string");

const { validate } = require("../../utils/helpers");
const notificationService = require("../../../services/NotificationService");
const verificationCodeRepository = require("../../repositories/VerificationCodeRepository");
const dayjs = require("dayjs");
exports.send = {
    validate: async (body) => {
        body.value = formatPhoneNumber(body.value || body.phoneNumber, body.countryCode || "NG");
        const schema = {
            value: Joi.required()
                .label("Phone Number"),
        };

        return validate(schema, body);
    },

    execute: async (body) => {
        let phoneNumber = formatPhoneNumber(body.value);
        let code = (isDevelopment || process.env.USE_STATIC_VERIFICATION_CODE) ? 4777 : randomString({
            length: 4,
            type: "numeric"
        });
        console.log("generating code", process.env.NODE_ENV, code, phoneNumber);

        //get cache response
        let verificationCode = await verificationCodeRepository.create({
            type: "phoneNumber",
            value: phoneNumber,
            code,
            expiry: dayjs().unix() + 300
        });

        console.log("Response", verificationCode, code);

        // const message = `Your verification code is ${code}. Mizala`;
        const message = `Your Mizala authentication number is ${code}. Expires in 5 minutes`;
        const {
            error,
            data
        } = await notificationService.sendSMS(phoneNumber, message);
        console.log("Send Verification SMS", {
            error,
            data
        });

        return {
            data: verificationCode
        };
    }
};

exports.verify = {
    validate: async (body) => {
        const schema = {
            value: Joi.required()
                .label("Phone Number"),
            code: Joi.required()
                .label("Verification Code")
        };

        return validate(schema, body);
    },

    execute: async (body) => {
        let {
            code,
            value,
        } = body;

        let phoneNumber = formatPhoneNumber(value);
        const verification = await verificationCodeRepository.findOne({
            type: "phoneNumber",
            value: phoneNumber,
            code,
            usedAt: null,
            expiry: {$gte:  dayjs().unix()}
        });

        if(!verification) {
            return {
                error: "Token Mismatch",
                statusCode: 500
            };
        }

        await verification.save({usedAt: dayjs().unix()});

        return { data: verification._id.toString() };
    }
};
