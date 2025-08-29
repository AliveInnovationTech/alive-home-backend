"use strict";
const { StatusCodes } = require("http-status-codes")
const authValidator = require("../validators/AuthValidator");
const crypto = require("crypto-random-string")
const { Op } = require("sequelize");
const passwordValidator = require("../validators/PasswordValidator");
const { sendEmailNotification } = require("../services/NotificationService");
const sequelize = require("../../lib/database");
const { handleServiceError, logInfo } = require("../utils/errorHandler");
const { createJWT } = require("../utils/jwt")


const getModels = () => {
    if (!sequelize.models.User || !sequelize.models.Token) {
        throw new Error('Models not loaded yet');
    }
    return {
        User: sequelize.models.User,
        Token: sequelize.models.Token,
        Role: sequelize.models.Role
    };
};

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

        const { User, Token, Role } = getModels();

        const conditions = [];
        if (email) conditions.push({ email });
        if (phoneNumber) conditions.push({ phoneNumber });

        if (conditions.length === 0) {
            throw new Error("Either email or phone is required");
        }

        const user = await User.scope('withPassword').findOne({
            where: { [Op.or]: conditions },
            include: [
                {
                    model: Role,
                    as: 'role',
                    attributes: ['roleId', 'name']
                }
            ]
        });

        if (!user) {
            return {
                error: "User doesn't exist on the platform",
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

        const token = createJWT({ payload: { userId: user.userId } });

        logInfo('User login successful', { userId: user.userId, email: user.email });

        return {
            data: {
                user: {
                    userId: user.userId,
                    email: user.email,
                    phoneNumber: user.phoneNumber,
                    role: user.role ? {
                        roleId: user.role.roleId,
                        name: user.role.name
                    } : null,
                    profilePicture: user.profilePicture,
                    isBuyerProfileFiled: user.isBuyerProfileFiled,
                    isDeveloperProfileFiled: user.isDeveloperProfileFiled,
                    isRealtorProfileFiled: user.isRealtorProfileFiled,
                    isHomeownerProfileFiled: user.isHomeownerProfileFiled

                },
                token
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        return handleServiceError('AuthService', 'login', e, 'An unknown error occurred during login. Please try again later');
    }
}


exports.me = async (userId) => {

    const { User } = getModels();
    try {
        const user = await User.findByPk(userId, {
            include: [{ association: 'role', attributes: ['name'] }]
        });
        if (!user) {
            return {
                error: "Oops! User not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        logInfo('User profile retrieved successfully', { userId: user.userId });

        return {
            data: {
                user: {
                    userId: user.userId,
                    email: user.email,
                    phoneNumber: user.phoneNumber,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role?.name || null,
                    profilePicture: user.profilePicture
                }
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        return handleServiceError('AuthService', 'me', e, 'An unknown error occurred while fetching user data. Please try again later');
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
        const { User, Token } = getModels();
        const { email } = body;
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return {
                error: "Oops! User not found on the platform",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        let token = await Token.findOne({
            where: {
                userId: user.userId,
                expiresAt: {
                    [Op.gt]: new Date()
                }
            }
        });

        if (!token) {
            token = await new Token({
                userId: user.userId,
                token: crypto({ length: 32 }),
                expiresAt: new Date(Date.now() + 3600000)
            }).save();
        }

        const html = `${process.env.FRONTEND_URL}/reset-password?userId=${user.userId}&token=${token.token}`;

        const data = {
            userId: user.userId,
            email: user.email,
            name: user.firstName,
            link: html,
        };
        await sendEmailNotification(
            data,
            "forgotPassword",
            "Password Reset Request",
        );

        logInfo('Password reset email sent successfully', { email: user.email, userId: user.userId });

        return {
            data: {
                userId: user.userId,
                message: "Password reset link sent to your email"
            },
            statusCode: StatusCodes.OK
        };
    } catch (e) {
        return handleServiceError('AuthService', 'forgotPassword', e, 'An unknown error occurred during password reset. Please try again later');
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
        const { User, Token } = getModels();
        const user = await User.findByPk(userId);
        if (!user) {
            return {
                error: "User not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        const existingToken = await Token.findOne({
            where: {
                userId: user.userId,
                token,
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

        user.password = body.password;
        await user.save();
        await existingToken.destroy();

        logInfo('Password reset successful', { userId: user.userId });

        return {
            data: {
                user: {
                    userId: user.userId,
                    message: "Password successfully reset"
                }
            },
            statusCode: StatusCodes.OK
        }

    } catch (e) {
        return handleServiceError('AuthService', 'resetPassword', e, 'An unknown error occurred during password reset. Please try again later');
    }
}

exports.changePassword = async (body, userId) => {
    try {
        const validatorError = await passwordValidator.updatePassword(body);
        if (validatorError) {
            return {
                error: validatorError,
                statusCode: StatusCodes.BAD_REQUEST
            }
        }
        const { User, Token } = getModels();
        const { oldPassword, newPassword } = body;
        const user = await User.scope('withPassword').findByPk(userId);
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

        logInfo('Password change successful', { userId: user.userId });

        return {
            data: {
                user: {
                    userId: user.userId,
                    message: "Password successfully updated"
                }
            },
            statusCode: StatusCodes.OK
        };
    } catch (e) {
        return handleServiceError('AuthService', 'changePassword', e, 'An unknown error occurred during password update. Please try again later');
    }
}
