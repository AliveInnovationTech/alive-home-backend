"use strict";
const userService = require("../services/UserService");
const authService = require("../services/AuthService");
const response = require("../utils/responses");

exports.check = async (req, res) => {
    const {
        data,
        statusCode
    } = await userService.check(req.query);

    return response.success(res, data, statusCode);
};

exports.create = async (req, res) => {
    const {
        error,
        statusCode,
        data: user
    } = await userService.createUser(req.body, res.contextUser);

    if (error) return response.error(res, error, statusCode);
    //generate token

    const {
        token,
        refresh,
        tokenExpiry,
        refreshExpiry
    } = await authService.generateTokens(user);


    return response.success(res, {
        verification: false,
        user,
        token,
        refresh,
        tokenExpiry,
        refreshExpiry
    }, statusCode);
};

exports.fetchAll = async (req, res) => {
    const {
        data,
        statusCode
    } = await userService.fetchAllUsers(req.query);

    return response.paginated(res, data, statusCode);
};

exports.findOne = async (req, res) => {
    const {
        data,
        error,
        statusCode
    } = await userService.findUser(req.params.id);

    if(error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};

exports.findByType = async (req, res) => {
    const {
        data,
        error,
        statusCode
    } = await userService.findByType(req.headers.source, req.params.type, req.params.value);

    if(error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};

exports.updateUser = async (req, res) => {
    const {
        data,
        error,
        statusCode
    } = await userService.updateUser(req.params.id, req.body, res.user, req.headers.source);

    if(error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};

exports.findOrCreate = async (req, res) => {
    const {
        data,
        error,
        statusCode
    } = await userService.findOrCreate(req.params.type, req.params.value, {
        ... req.body,
        withToken: req.query.withToken
    });

    if(error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};

exports.deleteUser = async (req, res) => {
    const {
        data,
        error,
        statusCode
    } = await userService.deleteUser(req.params.id);

    if(error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
};
