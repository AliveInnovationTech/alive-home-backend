"use strict";
const response = require("../utils/responses");
const propertyService = require("../services/PropertyService");



exports.createProperty = async (req, res) => {

    const result = await propertyService.createProperty(
        req.body,
        req.files,
        req.user,
    );

    if (result.error) {
        return response.error(res, result.error, result.statusCode);
    }

    return response.success(res, result.data, result.statusCode);
};

exports.createListing = async (req, res) => {
    const {
        error,
        data,
        statusCode
    } = await propertyService.createListing(req.body, req.params.propertyId, req.user)

    if (error) return response.error(res, error, statusCode);

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


exports.getProperty = async (req, res) => {
    const {
        error,
        data,
        statusCode
    } = await propertyService.getPropertyById(req.params.propertyId)

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
}

exports.getAllProperties = async (req, res) => {
    const {
        error,
        data,
        statusCode
    } = await propertyService.getAllProperties(req.query);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};

exports.getPropertiesByOwner = async (req, res) => {
    const {
        error,
        data,
        statusCode
    } = await propertyService.getPropertiesByOwner(req.params.ownerId, req.user, req.query);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
}

exports.updateProperty = async (req, res) => {
    const {
        error,
        data,
        statusCode
    } = await propertyService.updateProperty(
        req.params.propertyId,
        req.body, req.user,
        req.files);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
}

exports.deleteProperty = async (req, res) => {
    const {
        error,
        data,
        statusCode
    } = await propertyService.deleteProperty(req.params.propertyId, req.user);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};

exports.searchProperties = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await propertyService.searchProperties(req.query.q, req.query);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};

exports.getPropertyStats = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await propertyService.getPropertyStats(req.user, req.query);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};

exports.getPropertiesByUser = async (req, res) => {
    const {
        error,
        data,
        statusCode
    } = await propertyService.getPropertiesByUser(req.params.userId, req.user, req.query);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};

exports.updatePropertyStatus = async (req, res) => {
    const {
        error,
        data,
        statusCode
    } = await propertyService.updatePropertyStatus(
        req.params.propertyId,
        req.body.status,
        req.user
    );

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};
