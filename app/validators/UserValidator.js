"use strict";
const Joi = require("joi");
const { validate } = require("../utils/helpers");
const sequelize = require("../../lib/database");


const getModels = () => {
    if (!sequelize.models.User) {
        throw new Error('Models not loaded yet');
    }
    return {
        User: sequelize.models.User
    };
};
exports.createUser = async (body) => {
    const {
        email,
        phoneNumber,
    } = body;

    let schema = {
        email: Joi.string().email().required(),
        phoneNumber: Joi.string().required(),
        password: Joi.string().min(8).max(32).required(),
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        roleId: Joi.string()
    };
const { User } = getModels();
    const error = validate(schema, body);

    if (error) return error;

    if (!email && !phoneNumber) {
        return "Email or Phone Number should be provided";
    }

    if (email) {
        const emailExists = await User.findOne({ where: { email } });

        if (emailExists) {
            return "Email has been taken";
        }
    }

    if (phoneNumber) {
        const phoneExists = await User.findOne({ where: { phoneNumber } });

        if (phoneExists) {
            return "Phone Number has been taken";
        }
    }

    return null;


};

exports.updateUser = async(body)=>{
    let schema ={
    firstName: Joi.string(),
    lastName: Joi.string(),
    profilePicture: Joi.string().uri().optional(),
    cloudinary_id: Joi.string()
    }
 return validate(schema, body);
}
