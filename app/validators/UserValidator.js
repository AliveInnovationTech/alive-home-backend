"use strict";
const Joi = require("joi");
const { validate } = require("../utils/helpers");
const User = require("../models/UserModel");



exports.createUser = async (payload) => {
    const {
        email,
        phoneNumber,
    } = payload;

    let schema = {
        email: Joi.string().email().required(),
        phoneNumber: Joi.string().required(),
        password: Joi.string().min(8).max(15).required(),
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        roleId: Joi.string()
    };

    const error = validate(schema, payload);

    if (error) return error;

    if (!email && !phoneNumber) {
        return "Email or Phone Number should be provided";
    }

    if (email) {
        const emailExists = await User.findOne({
            email
        });

        if (emailExists) {
            return "Email has been taken";
        }
    }

    if (phoneNumber) {
        const phoneExists = await User.findOne({
            phoneNumber
        });

        if (phoneExists) {
            return "Phone Number has been taken";
        }
    }

    return null;


};
