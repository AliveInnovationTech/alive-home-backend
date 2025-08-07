"use strict";
const dayjs = require("dayjs");
const logger = require("mizala-logger");

const verifyInterface = require("../implementations/verifications");
const verificationValidator = require("../validators/VerificationValidator");
const verificationCodeRepository = require("../repositories/VerificationCodeRepository");
exports.initializeVerification = async (payload) => {
    const {
        error,
        statusCode,
        data
    } = await verifyInterface.sendVerificationCode(payload.type, payload);

    if (error) {
        return {
            error,
            statusCode: statusCode || 500
        };
    }

    return {
        data: data._id ||  "Verification Initiated",
        statusCode: 202
    };
};

exports.verifyCode = async (payload) => {
    const validationError = await verificationValidator.verifyCode(payload);

    if (validationError) {
        return {
            error: validationError,
            statusCode: 422
        };
    }

    let {
        error,
        statusCode,
        data,
    } = await verifyInterface.verifyCode(payload.type, payload);

    if (error) {
        return {
            error,
            statusCode
        };
    }

    return {
        data: {
            verificationToken: data,
        }
    };
};


exports.resolveVerificationToken = async (verificationToken) => {
    try{
        if(!verificationToken) return null;

        const verification = await verificationCodeRepository.findById(verificationToken);

        if(!verification) return null;

        const payload = {};

        if(verification.type === "phoneNumber"){
            payload.phoneNumber = verification.value;
            payload.phoneNumberVerifiedAt = dayjs().unix();
        }

        if(payload.type === "email"){
            payload.email = verification.value;
            payload.emailVerifiedAt = dayjs().unix();
        }
        // TODO: can't we have both?

        await verification.delete();

        return payload;
    }catch (e){
        logger.exception(e, {verificationToken});

        return null;
    }
};
