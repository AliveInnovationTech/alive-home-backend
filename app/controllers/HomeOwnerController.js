"use strict";
const response = require("../utils/responses");
const homeOwnerService = require("../services/HomeOwnerService");

exports.createHomeOwnerProfile = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await homeOwnerService.createHomeOwnerProfile(req.body, req.user);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};

exports.getHomeOwnerProfile = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await homeOwnerService.getHomeOwnerProfile(req.params.ownerId);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};

exports.updateHomeOwnerProfile = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await homeOwnerService.updateHomeOwnerProfile(req.params.ownerId, req.body, req.user);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};

exports.getAllHomeOwners = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await homeOwnerService.getAllHomeOwners(req.query.page, req.query.limit, req.query.search);

    if (error) return response.error(res, error, statusCode);

    return response.paginated(res, data, statusCode);
};

exports.deleteHomeOwnerProfile = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await homeOwnerService.deleteHomeOwnerProfile(req.params.ownerId, req.user);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};

exports.verifyHomeOwner = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await homeOwnerService.verifyHomeOwner(req.params.ownerId, req.body.verified, req.user);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};

exports.getMyHomeOwnerProfile = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await homeOwnerService.getMyHomeOwnerProfile(req.user.userId);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};

exports.uploadVerificationDocuments = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await homeOwnerService.uploadVerificationDocuments(req.params.ownerId, req.files, req.user);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};
