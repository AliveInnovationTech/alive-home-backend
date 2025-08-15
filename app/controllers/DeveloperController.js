"use strict";
const response = require("../utils/responses");
const developerService = require("../services/DeveloperService");

exports.createDeveloperProfile = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await developerService.createDeveloperProfile(req.body, req.user, req.file);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};

exports.getDeveloperProfile = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await developerService.getDeveloperProfile(req.params.developerId);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};

exports.updateDeveloperProfile = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await developerService.updateDeveloperProfile(req.params.developerId, req.body, req.user);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};

exports.getAllDevelopers = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await developerService.getAllDevelopers(req.query.page, req.query.limit, req.query.search);

    if (error) return response.error(res, error, statusCode);

    return response.paginated(res, data, statusCode);
};

exports.deleteDeveloperProfile = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await developerService.deleteDeveloperProfile(req.params.developerId, req.user);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};

exports.verifyDeveloper = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await developerService.verifyDeveloper(req.params.developerId, req.body.verified, req.user);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};

exports.getMyDeveloperProfile = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await developerService.getMyDeveloperProfile(req.user.userId);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};
