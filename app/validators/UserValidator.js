"use strict";
const Joi = require("joi");
const { validate } = require("../utils/helpers");
const userRepository = require("../repositories/UserRepository");
const { ROLES } = require("../utils/constants");

exports.createUser = async (payload) => {
    const {
        email,
        phoneNumber,
    } = payload;

    let schema = {
        name: Joi.string(),
        email: Joi.string().email(),
        phoneNumber: Joi.string(),
        password: Joi.string(),
        role: Joi.string().valid(ROLES.USER, ROLES.AGENT, ROLES.PARTNER),
    };

    const error = validate(schema, payload);

    if (error) return error;

    //check if both email and phoneNumber are empty. we need one of it
    if (!email && !phoneNumber) {
        return "Email or Phone Number should be provided";
    }

    //check if email or phone number exists already
    if (email) {
        const emailExists = await userRepository.findOne({
            email
        });

        if (emailExists) {
            return "Email has been taken";
        }
    }

    if (phoneNumber) {
        const phoneExists = await userRepository.findOne({
            phoneNumber
        });

        if (phoneExists) {
            return "Phone Number has been taken";
        }
    }

    return  null;
};
