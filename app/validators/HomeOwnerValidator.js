"use strict";
const Joi = require("joi");
const { validate } = require("../utils/helpers");

exports.createHomeOwnerProfile = async (payload) => {
    const schema = {
        primaryResidence: Joi.string().min(5).max(200).required(),
        preferredContactMethod: Joi.string().valid('EMAIL', 'PHONE', 'TEXT').default('EMAIL'),
        verificationDocsUrls: Joi.array().items(Joi.string().uri()).default([])
    };

    const error = validate(schema, payload);
    if (error) return error;

    return null;
};

exports.updateHomeOwnerProfile = async (payload) => {
    const schema = {
        primaryResidence: Joi.string().min(5).max(200),
        preferredContactMethod: Joi.string().valid('EMAIL', 'PHONE', 'TEXT'),
        verificationDocsUrls: Joi.array().items(Joi.string().uri())
    };

    const error = validate(schema, payload);
    if (error) return error;

    return null;
};

exports.verifyHomeOwner = async (payload) => {
    const schema = {
        verified: Joi.boolean().required()
    };

    const error = validate(schema, payload);
    if (error) return error;

    return null;
};
