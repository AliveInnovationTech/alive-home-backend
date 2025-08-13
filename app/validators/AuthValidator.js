"use strict";
const Joi = require("joi");



exports.login = async (body) => {
    const schema = Joi.object({
        email: Joi.string().email(),
        phoneNumber: Joi.string(),
        password: Joi.string().required()
    }).or("email", "phoneNumber");

    const {error} = schema.validate(body, {
        allowUnknown: true,
    });

    if (error)
        return error.details[0].message.replace(/['"]/g, "");

    return null;
};
