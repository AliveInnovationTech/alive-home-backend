"use strict";
const Joi = require("joi");
const { validate } = require("../utils/helpers");
const { PARTNER, STATUS } = require("../utils/constants");
const userRepository = require("../repositories/UserRepository");

exports.createPartner = async (payload) => {
    const {
        email,
        phoneNumber,
    } = payload;

    let schema = {
        name: Joi.string().required(),
        logo: Joi.string().uri(),
        email: Joi.string().email().required(),
        phoneNumber: Joi.string().required(),
        billingType: Joi.string().valid(PARTNER.BILLING_TYPE.POSTPAID, PARTNER.BILLING_TYPE.PREPAID),
        postpaidWalletThreshold: Joi.when("billingType", {
            is: PARTNER.BILLING_TYPE.POSTPAID,
            then: Joi.number().positive().required()
        })
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

    return null;
};

exports.updatePartner = async (payload) => {
    let schema = {
        name: Joi.string(),
        logo: Joi.string().uri(),
        billingType: Joi.string().valid(PARTNER.BILLING_TYPE.POSTPAID, PARTNER.BILLING_TYPE.PREPAID),
        status: Joi.string().valid(STATUS.ACTIVE, STATUS.IN_ACTIVE)
    };

    return validate(schema, payload);
};
