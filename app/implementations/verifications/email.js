"use strict";
const Joi = require("joi");
const randomString = require("crypto-random-string");

const { validate } = require("../../utils/helpers");
const notificationService = require("../../../services/NotificationService");
const verificationCodeRepository = require("../../repositories/VerificationCodeRepository");
const dayjs = require("dayjs");
exports.send = {
    validate: async (body) => {
        const schema = {
            value: Joi.string().email().required()
                .label("Email"),
        };

        return validate(schema, body);
    },

    execute: async (body) => {
        let code = body.code || (isDevelopment || process.env.USE_STATIC_VERIFICATION_CODE) ? 4777 : randomString({
            length: 4,
            type: "numeric"
        });
        console.log("generating code", process.env.NODE_ENV, code, body.email);

        //get cache response
        let verificationCode = await verificationCodeRepository.create({
            type: "email",
            value: body.email,
            code,
            expiry: dayjs().unix() + 300
        });

        console.log("Response", verificationCode, code);

        // const message = `Your verification code is ${code}. Mizala`;
        const message = `Your Mizala verification code is ${code}. Expires in 5 minutes`;
        const {
            error,
            data
        } = await notificationService.sendTemplateEmail({
            "subject": "PASSWORD RESET TOKEN",
            "recipients": [body.email],
            "data": {
                "message": [
                    message,
                    "Thank you for activating your account on Mizala. On behalf of the team, I welcome you to a smarter way to protect you, your loved ones and properties. <br/>",
                    "At Mizala, our goal is to simplify the process of getting insurance claims through technology and thereby protecting you and your insured properties.",
                    "<br/> Mizala makes your life easier with affordable, flexible & accessible insurance."
                ],
            },
        });
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
