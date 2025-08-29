"use strict";
const Joi = require("joi");
const { validate } = require("../utils/helpers");
const {PROPERTY_TYPES} = require("../utils/constants")

exports.createBuyerProfile = async (payload) => {
    const schema = {
        minimumBudget: Joi.number().positive().required(),
        maximumBudget: Joi.number().positive().required(),
        preApproved: Joi.boolean().default(false),
        preApprovalAmount: Joi.number().positive().allow(null),
        preferredLocations: Joi.array().items(Joi.string().min(2).max(100)).default([]),
        propertyType: Joi.string().valid(
            PROPERTY_TYPES.APARTMENT,
            PROPERTY_TYPES.HOUSE,
            PROPERTY_TYPES.VILLA,
            PROPERTY_TYPES.TOWNHOUSE,
            PROPERTY_TYPES.DETACHED_HOUSE,
            PROPERTY_TYPES.BOYS_QUARTERS,
            PROPERTY_TYPES.SEMI_DETACHED,
            PROPERTY_TYPES.TERRACE_HOUSE,
            PROPERTY_TYPES.DUPLEX,
            PROPERTY_TYPES.MANSION,
            PROPERTY_TYPES.ESTATE_HOUSE,
            PROPERTY_TYPES.BUNGALOW,
            PROPERTY_TYPES.PENTHOUSE,
            PROPERTY_TYPES.MINI_FLAT,
            PROPERTY_TYPES.CHALET,
            PROPERTY_TYPES.COMMERCIAL,
            PROPERTY_TYPES.LAND,
            PROPERTY_TYPES.COMMERCIAL_OFFICE,
            PROPERTY_TYPES.COMMERCIAL_PLAZA,
            PROPERTY_TYPES.RETAIL_SHOP,
            PROPERTY_TYPES.WAREHOUSE,
            PROPERTY_TYPES.HOTEL,
            PROPERTY_TYPES.LAND_RESIDENTIAL,
            PROPERTY_TYPES.ROOM_AND_PARLOUR,
            PROPERTY_TYPES.COMPOUND,
            PROPERTY_TYPES.STUDENT_HOSTEL,
            PROPERTY_TYPES.LAND_COMMERCIAL,
            PROPERTY_TYPES.LAND_INDUSTRIAL,
            PROPERTY_TYPES.LAND_AGRICULTURAL,
            PROPERTY_TYPES.SERVICED_APARTMENT,
            PROPERTY_TYPES.SELF_CONTAINED,
            PROPERTY_TYPES.LAND_RESIDENTIAL,
            PROPERTY_TYPES.CONDO,
            PROPERTY_TYPES.MULTIFAMILY,
            PROPERTY_TYPES.SINGLE_FAMILY
        ).default(PROPERTY_TYPES.APARTMENT),
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
        propertyType: Joi.string().valid( PROPERTY_TYPES.APARTMENT,
            PROPERTY_TYPES.HOUSE,
            PROPERTY_TYPES.VILLA,
            PROPERTY_TYPES.TOWNHOUSE,
            PROPERTY_TYPES.DETACHED_HOUSE,
            PROPERTY_TYPES.BOYS_QUARTERS,
            PROPERTY_TYPES.SEMI_DETACHED,
            PROPERTY_TYPES.TERRACE_HOUSE,
            PROPERTY_TYPES.DUPLEX,
            PROPERTY_TYPES.MANSION,
            PROPERTY_TYPES.ESTATE_HOUSE,
            PROPERTY_TYPES.BUNGALOW,
            PROPERTY_TYPES.PENTHOUSE,
            PROPERTY_TYPES.MINI_FLAT,
            PROPERTY_TYPES.CHALET,
            PROPERTY_TYPES.COMMERCIAL,
            PROPERTY_TYPES.LAND,
            PROPERTY_TYPES.COMMERCIAL_OFFICE,
            PROPERTY_TYPES.COMMERCIAL_PLAZA,
            PROPERTY_TYPES.RETAIL_SHOP,
            PROPERTY_TYPES.WAREHOUSE,
            PROPERTY_TYPES.HOTEL,
            PROPERTY_TYPES.LAND_RESIDENTIAL,
            PROPERTY_TYPES.ROOM_AND_PARLOUR,
            PROPERTY_TYPES.COMPOUND,
            PROPERTY_TYPES.STUDENT_HOSTEL,
            PROPERTY_TYPES.LAND_COMMERCIAL,
            PROPERTY_TYPES.LAND_INDUSTRIAL,
            PROPERTY_TYPES.LAND_AGRICULTURAL,
            PROPERTY_TYPES.SERVICED_APARTMENT,
            PROPERTY_TYPES.SELF_CONTAINED,
            PROPERTY_TYPES.LAND_RESIDENTIAL,
            PROPERTY_TYPES.CONDO,
            PROPERTY_TYPES.MULTIFAMILY,
            PROPERTY_TYPES.SINGLE_FAMILY),
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
