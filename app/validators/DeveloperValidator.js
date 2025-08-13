"use strict";
const Joi = require("joi");
const { validate } = require("../utils/helpers");
const sequelize = require("../../lib/database");
const { Developer } = sequelize.models;

exports.createDeveloperProfile = async (payload) => {
    const schema = {
        companyName: Joi.string().min(2).max(100).required(),
        cacRegNumber: Joi.string().min(5).max(20).required(),
        yearsInBusiness: Joi.number().integer().min(0).max(100),
        projectsCompleted: Joi.number().integer().min(0),
        websiteUrl: Joi.string().uri().allow('', null),
        officeAddress: Joi.string().min(10).max(500).required(),
        companyLogoUrl: Joi.string().uri().allow('', null),
        cloudinary_id: Joi.string().allow('', null)
    };

    const error = validate(schema, payload);
    if (error) return error;

    // Check if company name already exists
    const existingCompany = await Developer.findOne({
        where: { companyName: payload.companyName }
    });

    if (existingCompany) {
        return "Company name already exists";
    }

    // Check if CAC registration number already exists
    const existingCac = await Developer.findOne({
        where: { cacRegNumber: payload.cacRegNumber }
    });

    if (existingCac) {
        return "CAC registration number already exists";
    }

    return null;
};

exports.updateDeveloperProfile = async (payload) => {
    const schema = {
        companyName: Joi.string().min(2).max(100),
        cacRegNumber: Joi.string().min(5).max(20),
        yearsInBusiness: Joi.number().integer().min(0).max(100),
        projectsCompleted: Joi.number().integer().min(0),
        websiteUrl: Joi.string().uri().allow('', null),
        officeAddress: Joi.string().min(10).max(500),
        companyLogoUrl: Joi.string().uri().allow('', null),
        cloudinary_id: Joi.string().allow('', null)
    };

    const error = validate(schema, payload);
    if (error) return error;

    // If updating company name, check if it already exists
    if (payload.companyName) {
        const existingCompany = await Developer.findOne({
            where: { 
                companyName: payload.companyName,
                developerId: { [require('sequelize').Op.ne]: payload.developerId }
            }
        });

        if (existingCompany) {
            return "Company name already exists";
        }
    }

    // If updating CAC registration number, check if it already exists
    if (payload.cacRegNumber) {
        const existingCac = await Developer.findOne({
            where: { 
                cacRegNumber: payload.cacRegNumber,
                developerId: { [require('sequelize').Op.ne]: payload.developerId }
            }
        });

        if (existingCac) {
            return "CAC registration number already exists";
        }
    }

    return null;
};

exports.verifyDeveloper = async (payload) => {
    const schema = {
        verified: Joi.boolean().required()
    };

    const error = validate(schema, payload);
    if (error) return error;

    return null;
};
