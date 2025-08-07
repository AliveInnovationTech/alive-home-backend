"use strict";
const Joi = require("joi");
exports.verificationTypes = ["email","phone"];
const {validate} = require("../utils/helpers");
const {VERIFICATION_TYPE} = require("../utils/constants");

exports.verifyCode = async (payload) => {
    const schema = {
        type: Joi.string().valid(VERIFICATION_TYPE.EMAIL, VERIFICATION_TYPE.PHONE).required(),
        value: Joi.string(),
        code: Joi.required(),
    };

    return validate(schema, payload);
};
