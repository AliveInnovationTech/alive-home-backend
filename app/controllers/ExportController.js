"use strict";
const response = require("../utils/responses");
const exportService = require("../services/ExportService");

exports.users = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await exportService.users(req.query);

    if (error) return response.error(res, error, statusCode);

    res.setHeader("Content-disposition", `attachment; filename=customer-export-${new Date()}.csv`);
    res.set("Content-Type", "text/csv");

    return res.status(200)
        .send(data);
    // return response.success(res, data, statusCode);
};
