"use strict";
const response = require("../utils/responses");
const propertyService = require("../services/PropertyService");




exports.createListing = async (req, res) => {
    const {
        error,
        data,
        statusCode
    } = await propertyService.createListing(req.body, req.params.propertyId, req.user)

    if (error) return response.error(res, error, statusCode)

    return response.success(res, data, statusCode)
    
}


exports.getListingsByRole = async (req, res) => {
    const {
        error,
        data,
        statusCode
    } = await propertyService.getListingsByRole(req.user)

    if (error) return response.error(res, error, statusCode)

    return response.success(res, data, statusCode)
}