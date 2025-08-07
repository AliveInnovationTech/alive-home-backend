"use strict";
const phoneVerification = require("./phone");
const emailVerification = require("./email");
const randomString = require("crypto-random-string");

const verificationTypeMap = {
    email: emailVerification,
    phone: phoneVerification,
    phoneNumber: phoneVerification,
};

exports.sendVerificationCode = async (type, payload) => {
    console.log({
        type,
        payload
    });

    const verificationTypeInterface = verificationTypeMap[type];

    if (!verificationTypeInterface) {
        return {
            error: "Verification Type Not Supported",
            statusCode: 404
        };
    }

    const validationError = await verificationTypeInterface.send.validate(payload);

    if (validationError) {
        return {
            error: validationError,
            errorCode: 422
        };
    }

    return verificationTypeInterface.send.execute(payload);
};

exports.verifyCode = async (type, payload) => {
    const verificationTypeInterface = verificationTypeMap[type];

    if (!verificationTypeInterface) {
        return {
            error: "Verification Type Not Supported",
            statusCode: 404
        };
    }

    const validationError = await verificationTypeInterface.verify.validate(payload);

    if (validationError) {
        return {
            error: validationError,
            errorCode: 422
        };
    }

    return verificationTypeInterface.verify.execute(payload);
};

exports.sendVerificationCodeToAllChannels = async (user) => {
    if(!user.phoneNumber && !user.email) return {
        error: "Phone Number and/or Email is required"
    };

    let code = (isDevelopment || process.env.USE_STATIC_VERIFICATION_CODE) ? 4777 : randomString({
        length: 4,
        type: "numeric"
    });
    const allResponse = await Promise.all([phoneVerification.send.execute({
        value: user.phoneNumber,
        code,
    }), emailVerification.send.execute({
        value: user.email,
        code
    })]);
    console.log("All Response", allResponse);

    return {
        data: allResponse
    };
};


