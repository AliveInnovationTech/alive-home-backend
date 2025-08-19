"use strict";
const { validate } = require("../utils/helpers");
const Joi = require("joi");
const { CATEGORY } = require("../utils/constants")


exports.createPermission = async (body) => {
    let schema = {
        name: Joi.string()
            .pattern(/^[a-z_]+$/)
            .message('name must be lowercase_with_underscores')
            .required(),
        description: Joi.string().trim().optional(),
        category: Joi.string().valid(...CATEGORY).default(CATEGORY.GENERAL).required(),
        isActive: Joi.boolean().optional()

    }

    return validate(schema, body);
}


exports.updatePermission = async (body) => {
    let schema = {
        permissionId: Joi.string().uuid().required(),
        name: Joi.string()
            .pattern(/^[a-z_]+$/)
            .message('name must be lowercase_with_underscores')
            .optional(),
        description: Joi.string().trim().optional(),
        category: Joi.string().valid(...CATEGORY).default(CATEGORY.GENERAL).required(),
        isActive: Joi.boolean().optional()
    };

    return validate(schema, body);
};



