"use strict";
const { StatusCodes } = require("http-status-codes");
const User = require("../models/UserModel");
const userValidator = require("../validators/UserValidator");




exports.createUser = async (payload) => {
    try {
        const validatorError = await userValidator.createUser(payload);
        if (validatorError) {
            return {
                error: validatorError,
                statusCode: StatusCodes.BAD_REQUEST
            };
        }

        const user = await User.create({
            email: payload.email,
            phoneNumber: payload.phoneNumber,
            password: payload.password,
            firstName: payload.firstName,
            lastName: payload.lastName,
            roleId: payload.roleId
        });


        const userWithRole = await User.findByPk(user.id, {
            include: [
                {
                    model: Role,
                    as: 'role',
                    attributes: ['roleId', 'name']
                }
            ]
        });

        return {
            data: {
                userId: userWithRole.id,
                email: userWithRole.email,
                phoneNumber: userWithRole.phoneNumber,
                firstName: userWithRole.firstName,
                lastName: userWithRole.lastName,
                role: {
                    roleId: userWithRole.role?.id,
                    name: userWithRole.role?.name
                }
            },
            statusCode: StatusCodes.CREATED
        };

    } catch (e) {
        console.error("An unknown error has occurred while trying to create a user:", e);
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};


exports.getUserById = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            return {
                error: "Oops! The user you are looking for does not exist.",
                statusCode: StatusCodes.NOT_FOUND
            };
        }
        return {
            data: {
                userId: user.id,
                email: user.email,
                phoneNumber: user.phoneNumber,
                firstName: user.firstName,
                lastName: user.lastName,
                roleId: user.roleId
            },
            statusCode: StatusCodes.OK
        };
    } catch (e) {
        console.log("An unknown error has occurred while trying to retrieve a user" + e);
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};

exports.fetchAllUsers = async (page = 1, limit = 10, requestingUser) => {
    try {
        const pageNumber = Math.max(parseInt(page, 10), 1);
        const pageSize = Math.max(parseInt(limit, 10), 1);
        const offset = (pageNumber - 1) * pageSize;

        const { rows: users, count: totalUsers } = await User.findAndCountAll({
            offset,
            limit: pageSize
        });

        const data = users.map(user => {
            const canViewRole =
                requestingUser?.roleId === 'Admin' ||
                requestingUser?.roleId === 'Super Admin' ||
                requestingUser?.id === user.id;

            return {
                userId: user.id,
                email: user.email,
                phoneNumber: user.phoneNumber,
                firstName: user.firstName,
                lastName: user.lastName,
                roleId: canViewRole ? user.roleId : undefined
            };
        });

        return {
            data,
            pagination: {
                currentPage: pageNumber,
                pageSize,
                totalUsers,
                totalPages: Math.ceil(totalUsers / pageSize)
            },
            statusCode: StatusCodes.OK
        };
    } catch (e) {
        console.log("An unknown error has occurred.While trying to fetch users" + e);
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};

exports.deleteUser = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            return {
                error: "Oops! The user you are looking for does not exist. Hence, we cannot delete it.",
                statusCode: StatusCodes.NOT_FOUND
            };
        }
        await User.destroy({ where: { user_id: userId } });
        return {
            data: {
                userId: user.id
            },
            statusCode: StatusCodes.NO_CONTENT
        };
    } catch (e) {
        console.log("An unknown error has occurred while trying to delete a user" + e);
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};



