"use strict";
const { StatusCodes } = require("http-status-codes");
const sequelize = require("../../lib/database");
const userValidator = require("../validators/UserValidator");
const cloudinary = require("../utils/cloudinary");
const { handleServiceError, logInfo } = require("../utils/errorHandler");
const { Op } = require("sequelize")

const getModels = () => {
    if (!sequelize.models.User || !sequelize.models.Role) {
        throw new Error('Models not loaded yet');
    }
    return {
        User: sequelize.models.User,
        Role: sequelize.models.Role
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

        const { User, Role } = getModels();

        let roleId = body.roleId;

        if (!roleId) {
            if (body.role) {
                const existingRole = await Role.findOne({ where: { name: body.role.toUpperCase() } });
                if (!existingRole) {
                    throw new Error(`Role '${body.role}' not found. Please seed roles first.`);
                }
                roleId = existingRole.roleId;
            } else {
                const defaultRole = await Role.findOne({ where: { name: 'BUYER' } });
                if (!defaultRole) {
                    throw new Error("Default role 'BUYER' not found. Please seed roles first.");
                }
                roleId = defaultRole.roleId;
            }
        }

        const user = await User.create({
            email: body.email,
            phoneNumber: body.phoneNumber,
            password: body.password,
            firstName: body.firstName,
            lastName: body.lastName,
            roleId: roleId
        });

        const userWithRole = await User.findByPk(user.userId, {
            include: [
                { association: 'role', attributes: ['roleId', 'name'] }
            ]
        });

        return {
            data: {
                userId: userWithRole.userId,
                email: userWithRole.email,
                phoneNumber: userWithRole.phoneNumber,
                firstName: userWithRole.firstName,
                lastName: userWithRole.lastName,
                roles: userWithRole.role
                    ? [{ roleId: userWithRole.role.roleId, name: userWithRole.role.name }]
                    : []
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
        const user = await User.findByPk(userId, {
            include: [{ association: 'role', attributes: ['roleId', 'name'] }]
        });
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
                phone: user.phone,
                firstName: user.firstName,
                lastName: user.lastName,
                profilePictureUrl: user.profilePictureUrl,
                role: user.role
            },
            statusCode: StatusCodes.OK
        };
    } catch (e) {
        return handleServiceError('UserService', 'getUserById', e, 'An unknown error has occurred while trying to retrieve a user');
    }
};

exports.fetchAllUsers = async (page = 1, limit = 50, requestingUser) => {

    const { User, Role } = getModels();
    try {
        const pageNumber = Math.max(parseInt(page, 20), 1);
        const pageSize = Math.max(parseInt(limit, 20), 1);
        const offset = (pageNumber - 1) * pageSize;

        const requesterRole = requestingUser?.Role?.name || requestingUser?.roleName;

        let where = {};
        if (requesterRole === "ADMIN") {
            where = {
                "$role.name$": { [Op.ne]: "SYSADMIN" }
            };
        }

        const { rows: users, count: totalUsers } = await User.findAndCountAll({
            offset,
            limit: pageSize,
            where,
            include: [
                {
                    model: Role,
                    as: "role",
                    attributes: ["roleId", "name"]
                }
            ]
        });

        const data = users.map(user => {
            const canViewRole =
                requesterRole === "ADMIN" ||
                requesterRole === "SYSADMIN" ||
                requestingUser?.userId === user.userId;

            return {
                userId: user.userId,
                email: user.email,
                phone: user.phone,
                firstName: user.firstName,
                lastName: user.lastName,
                role: canViewRole ? user.role?.name : undefined
            };
        });

        logInfo("Users fetched successfully", { totalUsers, pageNumber, pageSize });

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
        return handleServiceError(
            "UserService",
            "fetchAllUsers",
            e,
            "An unknown error has occurred while trying to fetch users"
        );
    }
};


exports.updateUser = async (file, userId, body) => {
    const { User, Role } = getModels();
    try {
        const validatorError = await userValidator.updateUser(body);
        if (validatorError) {
            return {
                error: validatorError,
                statusCode: StatusCodes.BAD_REQUEST
            };
        }

        const user = await User.findByPk(userId, {
            include: [
                {
                    model: Role,
                    as: "role",
                    attributes: ["roleId", "name"]
                }
            ]
        });

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

        await user.update(update); // simpler than User.update(...)

        // Re-fetch user to include updated fields + role
        const updatedUser = await User.findByPk(userId, {
            include: [
                {
                    model: Role,
                    as: "role",
                    attributes: ["roleId", "name"]
                }
            ]
        });

        logInfo("User updated successfully", { userId: user.userId });

        return {
            data: {
                userId: updatedUser.userId,
                email: updatedUser.email,
                phone: updatedUser.phone,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                profilePicture: updatedUser.profilePicture,
                role: updatedUser.role ? {
                    roleId: updatedUser.role.roleId,
                    name: updatedUser.role.name
                } : null
            },
            statusCode: StatusCodes.OK
        };
    } catch (e) {
        return handleServiceError(
            "UserService",
            "updateUser",
            e,
            "An unknown error has occurred while trying to update a user"
        );
    }
};

exports.deleteUser = async (userId, requestingUser) => {
    const { User, Role } = getModels();
    try {
        const user = await User.findByPk(userId, {
            include: [{
                model: Role,
                as: "role",
                attributes: ["roleId", "name"]
            }]
        });

        if (!user) {
            return {
                error: "Oops! The user you are looking for does not exist. Hence, we cannot delete it.",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        if (user.role?.name === "SYSADMIN" && requestingUser?.role?.name === "ADMIN") {
            return {
                error: "Admins are not authorized to delete Sysadmins.",
                statusCode: StatusCodes.FORBIDDEN
            };
        }

        if (user.cloudinary_id) {
            try {
                await cloudinary.uploader.destroy(user.cloudinary_id);
                logInfo("User profile picture deleted from Cloudinary", {
                    userId: user.userId,
                    cloudinary_Id: user.cloudinary_id
                });
            } catch (cloudErr) {
                logError("Failed to delete user image from Cloudinary", {
                    userId: user.userId,
                    cloudinary_Id: user.cloudinary_id,
                    error: cloudErr.message
                });
            }
        }

        await User.destroy({ where: { userId: userId } });
        logInfo("User deleted successfully", { userId: user.userId });

        return {
            data: {
                userId: user.userId
            },
            statusCode: StatusCodes.NO_CONTENT
        };
    } catch (e) {
        return handleServiceError(
            "UserService",
            "deleteUser",
            e,
            "An unknown error has occurred while trying to delete a user"
        );
    }
};
