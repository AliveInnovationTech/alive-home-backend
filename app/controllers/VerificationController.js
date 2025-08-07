"use strict";
const verificationService = require("../services/VerificationService");
const response = require("../utils/responses");

exports.verifyByType = async (req, res) => {
    const {error, data, statusCode} = await verificationService.initializeVerification(req.body);

    if(error) return response.error(res, error, statusCode || 500);

    return response.success(res, data, statusCode);
};

exports.verifyCode = async (req, res) => {
    const {error, data, statusCode} = await verificationService.verifyCode(req.body);

    if(error) return response.error(res, error, statusCode || 500);

    return response.success(res, data, statusCode);
};
