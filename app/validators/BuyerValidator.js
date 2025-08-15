"use strict";
const Joi = require("joi");
const { validate } = require("../utils/helpers");

exports.createBuyerProfile = async (payload) => {
    const schema = {
        minimumBudget: Joi.number().positive().required(),
        maximumBudget: Joi.number().positive().required(),
        preApproved: Joi.boolean().default(false),
        preApprovalAmount: Joi.number().positive().allow(null),
        preferredLocations: Joi.array().items(Joi.string().min(2).max(100)).default([]),
        propertyType: Joi.string().valid('HOUSE', 'CONDO', 'TOWNHOUSE', 'MULTIFAMILY').default('HOUSE'),
        cloudinary_id: Joi.string().allow('', null)
    };

    const error = validate(schema, payload);
    if (error) return error;

    // Validate that maximum budget is greater than minimum budget
    if (payload.maximumBudget <= payload.minimumBudget) {
        return "Maximum budget must be greater than minimum budget";
    }

    // Validate pre-approval amount if provided
    if (payload.preApprovalAmount && payload.preApprovalAmount > payload.maximumBudget) {
        return "Pre-approval amount cannot exceed maximum budget";
    }

    return null;
};

exports.updateBuyerProfile = async (payload) => {
    const schema = {
        minimumBudget: Joi.number().positive(),
        maximumBudget: Joi.number().positive(),
        preferredLocations: Joi.array().items(Joi.string().min(2).max(100)),
        propertyType: Joi.string().valid('HOUSE', 'CONDO', 'TOWNHOUSE', 'MULTIFAMILY'),
        cloudinary_id: Joi.string().allow('', null)
    };

    const error = validate(schema, payload);
    if (error) return error;

    // Validate budget relationship if both are provided
    if (payload.minimumBudget && payload.maximumBudget && payload.maximumBudget <= payload.minimumBudget) {
        return "Maximum budget must be greater than minimum budget";
    }

    return null;
};

exports.updatePreApprovalStatus = async (payload) => {
    const schema = {
        preApproved: Joi.boolean().required(),
        preApprovalAmount: Joi.number().positive().when('preApproved', {
            is: true,
            then: Joi.required(),
            otherwise: Joi.optional()
        })
    };

    const error = validate(schema, payload);
    if (error) return error;

    return null;
};
