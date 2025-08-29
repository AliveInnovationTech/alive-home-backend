"use strict";
const response = require("../utils/responses");
const propertyService = require("../services/PropertyService");




exports.createListing = async (req, res) => {
    const {
        error,
        data,
        statusCode
    } = await propertyService.createListing(
        req.body,
        req.params.propertyId,
        req.user
    )

    if (error) return response.error(res, error, statusCode)

    return response.success(res, data, statusCode)

}


exports.getListingsByRole = async (req, res) => {
    const {
        error,
        statusCode,
        data

    } = await propertyService.getListingsByRole(
        req.query.role,
        req.query.page,
        req.query.limit
    )
    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode)

}

exports.updateListingStatus = async (req, res) => {
    const {
        error,
        data,
        statusCode
    } = await propertyService.updatePropertyListingStatus(
        req.params.propertyId,
        req.body.listingStatus,
        req.body.soldDate,
        req.user.userId
    )

    if (error) return response.error(res, error, statusCode)

    return response.success(res, data, statusCode)
}