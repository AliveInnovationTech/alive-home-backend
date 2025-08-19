"use strict";
const { StatusCodes } = require("http-status-codes");
const sequelize = require("../../lib/database");
const roleValidator = require("../validators/RoleValidator");
const { handleServiceError, logInfo } = require("../utils/errorHandler")




const getModels = () => {
    return {
        Role: sequelize.models.Role,
        Permissions: sequelize.models.Permission,
        RolePermission: sequelize.models.RolePermission
    };
};


exports.createRole = async (body) => {
    try {
        const validatorError = await roleValidator.createRole(body);
        if (validatorError) {
            logInfo("Role creation failed validation", { error: validatorError });
            return {
                statusCode: StatusCodes.BAD_REQUEST,
                error: validatorError
            };
        }
        const { Role } = getModels();

        const role = await Role.create({
            role: body.role,
            description: body.description,
            isActive: body.isActive
        });
        logInfo("Role created successfully", { role });
        return {
            data: role,
            status: StatusCodes.CREATED
        };
    } catch (e) {
        return handleServiceError(e, "RoleService.createRole", {
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
            error: e.message
        });
    }
};

exports.getRole = async (roleId) => {
    try {
        const { Role } = getModels();
        const role = await Role.findByPk(roleId);
        if (!role) {
            return {
                statusCode: StatusCodes.NOT_FOUND,
                error: `Role with ID ${roleId} not found`
            };
        }
        return {
            data: role,
            statusCode: StatusCodes.OK
        };
    } catch (e) {
        return handleServiceError(e, "RoleService.getRole", {
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
            error: e.message
        });
    }
};