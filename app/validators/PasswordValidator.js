"use strict";
const {validate} = require("../utils/helpers");

const Joi = require("joi");

exports.change = async (payload) => {
    const schema = {
        password: Joi.object({
            old: Joi.string().required(),
            new: Joi.string().required()
        }).required()
    };

    return validate(schema, payload);
};

exports.sendResetPasswordCode = async (payload) => {
    const schema = {
        type: Joi.string().valid("email", "phoneNumber").required(),
        value: Joi.string().required()
    };

    return validate(schema, payload);
};

exports.resetPassword = async (payload) => {
    const schema = {
        passwordResetToken: Joi.string().required(),
        code: Joi.string().required(),
        password: Joi.object({
            new: Joi.string().required()
        }).required()
    };

    return validate(schema, payload);
};


