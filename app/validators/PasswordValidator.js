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
        password: Joi.string().min(8).max(32).required(),
    }
    return validate(schema, body)
}

exports.updatePassword = async (body) => {
    let schema = {
        oldPassword: Joi.string().min(8).max(32).required(),
        newPassword: Joi.string().min(8).max(32).required(),
    }
    return validate(schema, body)
}

