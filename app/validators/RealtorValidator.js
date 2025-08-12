"use strict";
const Joi = require("joi");
const { validate } = require("../utils/helpers");
const sequelize = require("../../lib/database");

// Wait for models to be loaded
const getModels = () => {
    if (!sequelize.models.Realtor) {
        throw new Error('Models not loaded yet');
    }
    return {
        Realtor: sequelize.models.Realtor
    };
};

exports.createRealtorProfile = async (payload) => {
    const schema = {
        licenseNumber: Joi.string().min(5).max(20).required(),
        brokerageName: Joi.string().min(2).max(100).required(),
        yearsOfExperience: Joi.number().integer().min(0).max(50),
        specialties: Joi.array().items(Joi.string().min(2).max(50)).default([]),
        certifications: Joi.array().items(Joi.string().min(2).max(100)).default([]),
        verificationDocsUrls: Joi.array().items(Joi.string().uri()).default([])
    };

    const error = validate(schema, payload);
    if (error) return error;

    // Check if license number already exists
    const { Realtor } = getModels();
    const existingLicense = await Realtor.findOne({
        where: { licenseNumber: payload.licenseNumber }
    });

    if (existingLicense) {
        return "License number already exists";
    }

    return null;
};

exports.updateRealtorProfile = async (payload) => {
    const schema = {
        brokerageName: Joi.string().min(2).max(100),
        yearsOfExperience: Joi.number().integer().min(0).max(50),
        specialties: Joi.array().items(Joi.string().min(2).max(50)),
        certifications: Joi.array().items(Joi.string().min(2).max(100)),
        verificationDocsUrls: Joi.array().items(Joi.string().uri())
    };

    const error = validate(schema, payload);
    if (error) return error;

    return null;
};

exports.verifyRealtor = async (payload) => {
    const schema = {
        verified: Joi.boolean().required()
    };

    const error = validate(schema, payload);
    if (error) return error;

    return null;
};
