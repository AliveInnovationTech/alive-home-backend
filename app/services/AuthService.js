"use strict";
const User = require("../models/UserModel");
const { StatusCodes } = require("http-status-codes")
const authValidator = require("../validators/AuthValidator");
const jwt = require("jsonwebtoken");
const crypto = require("crypto-random-string")
const { Op } = require("sequelize");
const Token = require("../models/TokenModel");
const passwordValidator = require("../validators/PasswordValidator");
const {sendEmailNotification} = require("../services/NotificationService")





exports.login = async (body) => {
    try {
        const validatorError = await authValidator.login(body);
        if (validatorError) {
            return {
                error: validatorError,
                statusCode: StatusCodes.BAD_REQUEST
            }
        }
        const { email, phoneNumber, password } = body;

        const user = await User.findOne({ $or: [{ email }, { phoneNumber }] });
        if (!user) {
            return {
                error: "User not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        const isMatch = await user.validatePassword(password);
        if (!isMatch) {
            return {
                error: "Invalid credentials",
                statusCode: StatusCodes.UNAUTHORIZED
            };
        }

        const token = jwt.sign({ userId: user.id },
            process.env.SECURITY_TOKEN,
            { expiresIn: "1h" },
            { algorithm: "HS256" }
        );

        return {
            data: {
                user: {
                    userId: user.userId,
                    email: user.email,
                    phoneNumber: user.phoneNumber,
                    roles: user.roles.map(role => role.name),
                    profilePictureUrl: user.profilePictureUrl
                },
                token
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        console.log("An unknown error occurred during login. Please try again later");
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        }
    }
}

exports.me = async (payload) => {
    try {
        const user = await User.findById(payload.userId);
        if (!user) {
            return {
                error: "Oops! User not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        return {
            data: {
                user: {
                    userId: user.userId,
                    email: user.email,
                    phoneNumber: user.phoneNumber,
                    roles: user.roles.map(role => role.name),
                    profilePictureUrl: user.profilePictureUrl
                }
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        console.log("An unknown error occurred while fetching user data. Please try again later");
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        }
    }
}

exports.forgotPassword = async (body) => {
    try {
        const validatorError = await passwordValidator.forgotPassword(body);
        if (validatorError) {
            return {
                error: validatorError,
                statusCode: StatusCodes.BAD_REQUEST
            }
        }

        const { email } = body;
        const user = await User.findOne({ email });
        if (!user) {
            return {
                error: "User not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

      let token = await Token.findOne({
            where: {
                userId: user.id,
                type: 'PASSWORD_RESET',
                expiresAt: {
                    [Op.gt]: new Date() 
                }
            }
        });

        if (token) {
            return {
                data: {
                    token: token.token
                },
                statusCode: StatusCodes.OK
            };
        }

        const newToken = crypto({ length: 32 });
        await Token.create({
            token,
            userId: user.id
        });

        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=/${user.id}/${newToken}`;

        await sendEmailNotification(
            user.email, 
            user.firstName, 
            "Password Reset Request", 
            "forgotPassword",
            {
            link: resetLink
            }
        );

        return {
            data: {
                message: "Password reset link sent to your email"
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        console.log("An unknown error occurred during password reset. Please try again later");
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        }
    }
}

exports.resetPassword = async (body, userId, token) => {
    try {
        const validatorError = await passwordValidator.resetPassword(body);
        if (validatorError) {
            return {
                error: validatorError,
                statusCode: StatusCodes.BAD_REQUEST
            }
        }

        //const { userId, token, newPassword } = body;
        const user = await User.findById(userId);
        if (!user) {
            return {
                error: "User not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        const existingToken = await Token.findOne({
            where: {
                userId: user.id,
                token,
                type: 'PASSWORD_RESET',
                expiresAt: {
                    [Op.gt]: new Date() 
                }
            }
        });

        if (!existingToken) {
            return {
                error: "Invalid or expired token",
                statusCode: StatusCodes.UNAUTHORIZED
            };
        }

        user.password = body.newPassword;
        await user.save();
        await existingToken.destroy();

        return {
            data: {
            user:{
            userId: user.id,
            message: "Password successfully reset"
            },
          statusCode: StatusCodes.OK
        }
    }

    } catch (e) {
        console.log("An unknown error occurred during password reset. Please try again later");
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        }
    }
}

exports.changePassword = async(body, userId) => {
    try {
        const validatorError = await passwordValidator.updatePassword(body);
        if (validatorError) {
            return {
                error: validatorError,
                statusCode: StatusCodes.BAD_REQUEST
            }
        }

        const { oldPassword, newPassword } = body;
        const user = await User.findById(userId);
        if (!user) {
            return {
                error: "User not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        const isMatch = await user.validatePassword(oldPassword);
        if (!isMatch) {
            return {
                error: "Old password is incorrect",
                statusCode: StatusCodes.UNAUTHORIZED
            };
        }

        user.password = newPassword;
        await user.save();

        return {
            data: {
                user: {
                    userId: user.id,
                    message: "Password successfully updated"
                }
            },
            statusCode: StatusCodes.OK
        };
    } catch (e) {
        console.log("An unknown error occurred during password update. Please try again later");
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        }
    }
}
