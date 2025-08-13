"use strict";
const Joi = require("joi");
const { validate } = require("../utils/helpers");
const User = require("../models/UserModel");



exports.createUser = async (body) => {
    const {
        email,
        phoneNumber,
    } = body;

    let schema = {
        email: Joi.string().email().required(),
        phoneNumber: Joi.string().required(),
        password: Joi.string().min(8).max(15).required(),
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        roleId: Joi.string()
    };

    const error = validate(schema, body);

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

exports.updateUser = async(body)=>{
    let schema ={
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    profilePicture: Joi.string().uri().optional(),
    cloudinary_id: Joi.string()
    }
 return validate(schema, body);
}
