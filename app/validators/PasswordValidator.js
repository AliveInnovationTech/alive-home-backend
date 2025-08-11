"use strict";
const Joi = require("joi");
const { validate } = require("../utils/helpers")


exports.forgotPassword = async (body) => {
    let schema = {
        email: Joi.string().email().required(),
    }
    return validate(schema, body)
}

exports.resetPassword = async (body) => {
    let schema = {
        password: Joi.string().required()
    }
    return validate(schema, body)
}

exports.updatePassword = async (body) => {
    let schema = {
        oldPassword: Joi.string().required(),
        newPassword: Joi.string().required(),
    }
    return validate(schema, body)
}

