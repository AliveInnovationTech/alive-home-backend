"use strict";
const partnerService = require("../services/PartnerService");
const response = require("../utils/responses");


exports.create = async (req, res) => {
    const {
        error,
        statusCode,
        data: partner
    } = await partnerService.createPartner(req.body, res.contextUser);

    if (error) return response.error(res, error, statusCode);
    //generate token

    return response.success(res, partner, statusCode);
};

exports.fetchAll = async (req, res) => {
    const {
        data,
        statusCode
    } = await partnerService.fetchAll(req.query);

    return response.paginated(res, data, statusCode);
};

exports.findOne = async (req, res) => {
    const {
        data,
        error,
        statusCode
    } = await partnerService.findPartner(req.params.id);

    if(error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};

exports.update = async (req, res) => {
    const {
        data,
        error,
        statusCode
    } = await partnerService.updatePartner(req.params.id, req.body, res.user);

    if(error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};
