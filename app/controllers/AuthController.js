"use strict";
const authService = require("../services/AuthService");
const response = require("../utils/responses");


exports.login = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await authService.login(req.body);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);

}

exports.me = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await authService.me(req.params.userId);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);

}

exports.forgotPassword = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await authService.forgotPassword(req.body);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
}

exports.resetPassword = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await authService.resetPassword(req.body, req.params.userId, req.params.token);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
}

exports.changePassword = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await authService.changePassword(req.body, req.params.userId);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
}