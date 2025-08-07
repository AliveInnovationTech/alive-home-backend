"use strict";
const passwordService = require("../services/PasswordService");
const response = require("../utils/responses");


exports.change = async (req, res) => {
    const {
        error,
        data,
        statusCode
    } = await passwordService.changePassword(res.user, req.body);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};

exports.sendResetPasswordCode = async (req, res) => {
    const {
        error,
        data,
        statusCode
    } = await passwordService.sendResetPasswordCode(req.body);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};

exports.resetPassword = async (req, res) => {
    const {
        error,
        data,
        statusCode
    } = await passwordService.resetPassword(req.body);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};
