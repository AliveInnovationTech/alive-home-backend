"use strict";
const authService = require("../services/AuthService");
const response = require("../utils/responses");
/**
 * Login
 *
 * @param req
 * @param res
 * @returns {Promise<void>}
 */
exports.login = async (req, res) => {
    const {
        error,
        data,
        statusCode
    } = await authService.login({
        ...req.body,
        ip: req.ip,
        requestId: req.headers["x-request-id"],
        headers: req.headers,
    });

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};

exports.me = async (req, res) => {
    const {
        error,
        data,
        statusCode
    } = await authService.me({
        user: res.contextUser,
    });

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};

exports.refresh = async (req, res) => {
    const {
        error,
        data,
        statusCode
    } = await authService.refresh({
        ...req.body,
        user: res.user,
        client: res.client
    });

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};

exports.validateUserAccess = async (req, res) => {
    const {
        error,
        data,
        statusCode
    } = await authService.validateUserAccess({
        token: req.body.token,
    });

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};

exports.validatePartnerAccess = async (req, res) => {
    const {
        error,
        data,
        statusCode
    } = await authService.validatePartnerAccess(req.body);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};

