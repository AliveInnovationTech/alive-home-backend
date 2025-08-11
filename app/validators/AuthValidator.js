"use strict";
const Joi = require("joi");
const{validate} = require("../utils/helpers")

// exports.register = async (payload) => {
//     const schema = Joi.object({
//         email: Joi.string().email().required(),
//         phoneNumber: Joi.string().required(),
//         password: Joi.string().min(8).max(15).required(),
//         firstName: Joi.string().required(),
//         lastName: Joi.string().required()
//     });

//     return validate(schema, payload);
// };

exports.login = async (payload) => {
    const schema = Joi.object({
        email: Joi.string().email(),
        phoneNumber: Joi.string(),
        password: Joi.string().required()
    }).or("email", "phoneNumber");

    const {error} = schema.validate(payload, {
        allowUnknown: true,
    });

    if (error)
        return error.details[0].message.replace(/['"]/g, "");

    return null;
};
