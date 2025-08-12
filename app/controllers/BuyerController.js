"use strict";
const response = require("../utils/responses");
const buyerService = require("../services/BuyerService");

exports.createBuyerProfile = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await buyerService.createBuyerProfile(req.body, req.user);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};

exports.getBuyerProfile = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await buyerService.getBuyerProfile(req.params.buyerId);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};

exports.updateBuyerProfile = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await buyerService.updateBuyerProfile(req.params.buyerId, req.body, req.user);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};

exports.getAllBuyers = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await buyerService.getAllBuyers(req.query.page, req.query.limit, req.query.search, req.query.propertyType, req.query.minBudget, req.query.maxBudget);

    if (error) return response.error(res, error, statusCode);

    return response.paginated(res, data, statusCode);
};

exports.deleteBuyerProfile = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await buyerService.deleteBuyerProfile(req.params.buyerId, req.user);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};

exports.updatePreApprovalStatus = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await buyerService.updatePreApprovalStatus(req.params.buyerId, req.body, req.user);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};

exports.getMyBuyerProfile = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await buyerService.getMyBuyerProfile(req.user.userId);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};

exports.searchProperties = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await buyerService.searchProperties(req.params.buyerId, req.query);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};
