"use strict";
const response = require("../utils/responses");
const userService = require("../services/UserService");



exports.createUser = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await userService.createUser(req.body);

    if (error) return response.error(res, error, statusCode);


    return response.success(res, data, statusCode);
}

exports.getUserById = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await userService.getUserById(req.params.userId);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};

exports.fetchAllUsers = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await userService.fetchAllUsers(req.query.page, req.query.limit, req.user);

    if (error) return response.error(res, error, statusCode);

    return response.paginated(res, data, statusCode);
};

exports.updateUser = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await userService.updateUser(req.file, req.params.userId, req.body);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};

exports.deleteUser = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await userService.deleteUser(req.params.userId);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};
