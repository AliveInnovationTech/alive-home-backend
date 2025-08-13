"use strict";
const response = require("../utils/responses");
const realtorService = require("../services/RealtorService");

exports.createRealtorProfile = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await realtorService.createRealtorProfile(req.body, req.user);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};

exports.getRealtorProfile = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await realtorService.getRealtorProfile(req.params.realtorId);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};

exports.updateRealtorProfile = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await realtorService.updateRealtorProfile(req.params.realtorId, req.body, req.user);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};

exports.getAllRealtors = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await realtorService.getAllRealtors(req.query.page, req.query.limit, req.query.search, req.query.specialty, req.query.isVerified);

    if (error) return response.error(res, error, statusCode);

    return response.paginated(res, data, statusCode);
};

exports.deleteRealtorProfile = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await realtorService.deleteRealtorProfile(req.params.realtorId, req.user);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};

exports.verifyRealtor = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await realtorService.verifyRealtor(req.params.realtorId, req.body.verified, req.user);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};

exports.getMyRealtorProfile = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await realtorService.getMyRealtorProfile(req.user.userId);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};

exports.uploadVerificationDocuments = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await realtorService.uploadVerificationDocuments(req.params.realtorId, req.files, req.user);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};

exports.getRealtorStats = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await realtorService.getRealtorStats(req.params.realtorId);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};
