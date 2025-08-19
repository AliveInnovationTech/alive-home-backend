"use strict";
const Joi = require("joi");
const { validate } = require("../utils/helpers");




exports.createRole = async (body) => {
    let schema = {
        name: Joi.string().min(2).trim().max(100).required(),
        description: Joi.string().trim().max(255).optional()
    };

    return validate(schema, body);
};


exports.updateRole = async (body) => {
    let schema = {
        name: Joi.string().min(2).trim().max(100).required(),
        description: Joi.string().trim().max(255).optional()
    };

    return validate(schema, body);
};

exports.assignPermissions = async (body) => {
    let schema = {
        roleId: Joi.string().uuid().required(),
        permissionIds: Joi.array().items(Joi.string().uuid()).min(1).required()
    };

    return validate(schema, body);
};
exports.paginate = async (body) => {
    let schema = {
        page: Joi.number().integer().min(1).optional(),
        limit: Joi.number().integer().min(1).max(100).optional(),
        search: Joi.string().trim().optional()
    }
return validate(schema, body)
}

exports.roleIdParam = async (body) => {
    let schema = {
        roleId: Joi.string().uuid().required()
    };

    return validate(schema, body);
};

exports.revokePermission = async (body) => {
    let schema = {
        roleId: Joi.string().uuid().required(),
        permissionId: Joi.string().uuid().required()
    };

    return validate(schema, body);
};
