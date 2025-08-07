"use strict";
const { formatPhoneNumber } = require("tm-utils");
const logger = require("mizala-logger");
const bcrypt = require("bcryptjs");
const verificationCodeRepository = require("../repositories/VerificationCodeRepository");

const userRepository = require("../repositories/UserRepository");
const userEvents = require("../events/UserEvent");
const passwordValidator = require("../validators/PasswordValidator");

const { EVENT } = require("../utils/constants");
const randomString = require("crypto-random-string");
const dayjs = require("dayjs");
const notificationService = require("../../services/NotificationService");

exports.changePassword = async (contextUser, payload) => {
    const validationError = await passwordValidator.change(payload);

    if (validationError) {
        return {
            error: validationError,
            statusCode: 422
        };
    }

    const user = await userRepository.findById(contextUser.userId);
    const hasOldPassword = !!user.password;
    const isOldPasswordCorrect = bcrypt.compareSync(payload.password.old, user.password);

    if (!isOldPasswordCorrect) {
        return {
            error: "Incorrect Old Password",
            statusCode: 400
        };
    }

    const newPassword = bcrypt.hashSync(payload.password.new, 10);
    await user.updateOne({ password: newPassword });

    userEvents.emit(EVENT.PASSWORD.CHANGED, user, hasOldPassword);

    return { data: "Password Changed Successfully" };
};

exports.sendResetPasswordCode = async (payload) => {
    const validationError = await passwordValidator.sendResetPasswordCode(payload);

    if (validationError) {
        return {
            error: validationError,
            statusCode: 422
        };
    }

    if (payload.type === "phoneNumber") payload.value = formatPhoneNumber(payload.value);

    const user = await userRepository.findOne({ [payload.type]: payload.value });

    if (!user) {
        return {
            error: `Oops!!! Account Attached to this ${payload.type} Not Found"`,
            statusCode: 404
        };
    }

    let code = (isDevelopment || process.env.USE_STATIC_VERIFICATION_CODE) ? 4777 : randomString({
        length: 4,
        type: "numeric"
    });

    console.log("generating code", process.env.NODE_ENV, code, {
        phoneNumber: user.phoneNumber,
        email: user.email,
    });

    //get cache response
    let verificationCode = await verificationCodeRepository.create({
        type: "user-id",
        value: user._id,
        code,
        expiry: dayjs()
            .unix() + 300
    });

    console.log("Response", verificationCode, code);

    if (user.phoneNumber) {
        // const message = `Your verification code is ${code}. Mizala`;
        const message = `Your Mizala authentication number is ${code}. Expires in 5 minutes`;
        const {
            error: sendCodeToPhoneNumberError,
            data: sendCodeToPhoneNumberData
        } = await notificationService.sendSMS(user.phoneNumber, message);
        logger.info("Send Password Reset SMS to: " + user.phoneNumber, {
            error: sendCodeToPhoneNumberError,
            data: sendCodeToPhoneNumberData
        });
    }

    if (user.email) {
        const message = `Your Mizala verification code is <strong>${code}</strong>. Expires in 5 minutes`;
        const {
            error: sendCodeToEmailError,
            data: sendCodeToEmailData
        } = await notificationService.sendTemplateEmail({
            "subject": "PASSWORD RESET TOKEN",
            "recipients": [user.email],
            "data": {
                "message": [
                    "Hi " + user.name,
                    message,
                    "At Mizala, our goal is to simplify the process of getting insurance claims through technology and thereby protecting you and your insured properties.",
                    "<br/> Mizala makes your life easier with affordable, flexible & accessible insurance."
                ],
            },
        });

        logger.info("Send Password Reset email to: " + user.email, {
            error: sendCodeToEmailError,
            data: sendCodeToEmailData
        });
    }

    return {
        data: {
            passwordResetToken: verificationCode._id,
        },
        statusCode: 201
    };
};

exports.resetPassword = async (payload) => {
    const validationError = await passwordValidator.resetPassword(payload);

    if (validationError) {
        return {
            error: validationError,
            statusCode: 422
        };
    }

    let verificationCode = await verificationCodeRepository.findById(payload.passwordResetToken);

    if (!verificationCode) {
        return {
            error: "Invalid Password Reset Token",
            statusCode: 400
        };
    }

    // console.log("resetPayload", verificationCode);

    let user = await userRepository.findById(verificationCode.value);

    if (!user) {
        return {
            error: `Account Attached to this ${verificationCode.type} Not Found`,
            statusCode: 404
        };
    }

    if (verificationCode.code !== payload.code) {
        return {
            error: "Token Mismatch",
            statusCode: 500
        };
    }

    await verificationCode.delete();

    const hasOldPassword = !!user.password;
    user.password = bcrypt.hashSync(payload.password.new, 10);
    await user.save();

    userEvents.emit(EVENT.PASSWORD.CHANGED, user, hasOldPassword);

    return { data: "Password reset successfully" };
};

