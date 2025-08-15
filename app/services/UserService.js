"use strict";
const { StatusCodes } = require("http-status-codes");
const sequelize = require("../../lib/database");
const userValidator = require("../validators/UserValidator");
const cloudinary = require("../utils/cloudinary");
const logger = require("../utils/logger");
const { handleServiceError, logInfo } = require("../utils/errorHandler");

const getModels = () => {
    if (!sequelize.models.User) {
        throw new Error('Models not loaded yet');
    }
    return {
        User: sequelize.models.User
    };
};

exports.createUser = async (body) => {
    try {
        const validatorError = await userValidator.createUser(body);
        if (validatorError) {
            return {
                error: validatorError,
                statusCode: StatusCodes.BAD_REQUEST
            };
        }

        const { User } = getModels()

        const user = await User.create({
            email: body.email,
            phoneNumber: body.phoneNumber,
            password: body.password,
            firstName: body.firstName,
            lastName: body.lastName,
            roleId: body.roleId
        });


        const userWithRole = await User.findByPk(user.userId, {
            include: [{ association: 'roles', attributes: ['roleId', 'name'], through: { attributes: [] } }]
        });

        logInfo('User created successfully', { userId: userWithRole.userId, email: userWithRole.email });
        
        return {
            data: {
                userId: userWithRole.userId,
                email: userWithRole.email,
                phoneNumber: userWithRole.phoneNumber,
                firstName: userWithRole.firstName,
                lastName: userWithRole.lastName,
                roles: userWithRole.roles?.map(role => ({
                    roleId: role.roleId,
                    name: role.name
                })) || []
            },
            statusCode: StatusCodes.CREATED
        };

    } catch (e) {
        return handleServiceError('UserService', 'createUser', e, 'An unknown error has occurred while trying to create a user');
    }
};


exports.getUserById = async (userId) => {
    const { User } = getModels()
    try {
        const user = await User.findByPk(userId);
        if (!user) {
            return {
                error: "Oops! The user you are looking for does not exist.",
                statusCode: StatusCodes.NOT_FOUND
            };
        }
        logInfo('User retrieved successfully', { userId: user.userId });
        
        return {
            data: {
                userId: user.userId,
                email: user.email,
                phoneNumber: user.phoneNumber,
                firstName: user.firstName,
                lastName: user.lastName,
                roleId: user.roleId
            },
            statusCode: StatusCodes.OK
        };
    } catch (e) {
        return handleServiceError('UserService', 'getUserById', e, 'An unknown error has occurred while trying to retrieve a user');
    }
};

exports.fetchAllUsers = async (page = 1, limit = 10, requestingUser) => {
    const {User} =getModels()
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
                requestingUser?.roleId === 'admin' ||
                requestingUser?.roleId === 'superadmin' ||
                requestingUser?.userId === user.userId;

            return {
                userId: user.userId,
                email: user.email,
                phoneNumber: user.phoneNumber,
                firstName: user.firstName,
                lastName: user.lastName,
                roleId: canViewRole ? user.roleId : undefined
            };
        });

        logInfo('Users fetched successfully', { totalUsers, pageNumber, pageSize });
        
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
        return handleServiceError('UserService', 'fetchAllUsers', e, 'An unknown error has occurred while trying to fetch users');
    }
};

exports.updateUser = async (file, userId, body) => {
    const {User} =getModels()
    try {
        const validatorError = await userValidator.updateUser(body);
        if (validatorError) {
            return {
                error: validatorError,
                statusCode: StatusCodes.BAD_REQUEST
            };
        }
        const user = await User.findByPk(userId);

        if (!user) {
            return {
                error: "Oops! The user you are looking for does not exist.",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        let result;
        if (file) {
            result = await cloudinary.uploader.upload(file.path, {
                folder: "Alive/users",
                resource_type: "image",
                height: 400,
                width: 400,
                crop: "scale"
            });
        }
        const update = {
            firstName: body.firstName || user.firstName,
            lastName: body.lastName || user.lastName,
            profilePicture: result?.secure_url || user.profilePicture,
            cloudinary_Id: result?.public_id || user.cloudinary_Id
        };

        await User.update(update, { where: { userId: userId } });
        logInfo('User updated successfully', { userId: user.userId });
        
        return {
            data: {
                userId: user.userId,
                ...update
            },
            statusCode: StatusCodes.OK
        };
    } catch (e) {
        return handleServiceError('UserService', 'updateUser', e, 'An unknown error has occurred while trying to update a user');
    }
};

exports.deleteUser = async (userId) => {
    const { User } = getModels();
    try {
        const user = await User.findByPk(userId);
        if (!user) {
            return {
                error: "Oops! The user you are looking for does not exist. Hence, we cannot delete it.",
                statusCode: StatusCodes.NOT_FOUND
            };
        }
        await User.destroy({ where: { userId: userId } });
        logInfo('User deleted successfully', { userId: user.userId });
        
        return {
            data: {
                userId: user.userId
            },
            statusCode: StatusCodes.NO_CONTENT
        };
    } catch (e) {
        return handleServiceError('UserService', 'deleteUser', e, 'An unknown error has occurred while trying to delete a user');
    }
};



