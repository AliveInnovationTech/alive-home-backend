"use strict";
const Joi = require("joi");
const debug = require("debug")("app:debug");

const userRepository = require("../repositories/UserRepository");
const {
    validate,
    verifyJWT
} = require("../utils/helpers");

exports.savePassword = async (req, res, next) => {
    let token = req.headers["x-access-token"] || req.headers["authorization"] || req.body.token;

    if (!token) throw new Error("No token provided.");
    if (token.startsWith("Bearer ")) {
        token = token.slice(7, token.length);
    }

    const { userId } = await verifyJWT(token);
    debug(userId);
    if (!userId) {
        throw new Error("Failed to validate provided token.");
    }

    const schema = {
        password: Joi.string()
            .required(),
        userId: Joi.string()
            .required()
    };

    req.body.userId = userId;

    const result = validate(schema, req.body);

    if (result) {
        return createErrorResponse(res, result, 422);
    }

    //check if auth credentials exist
    const auth = await userRepository.findOne({
        userId: req.body.userId,
        clientId: res.clientId
    });

    if (!auth) {
        return createErrorResponse(res, "User Not Found", 404);
    }

    res.auth = auth;

    return next();
};

exports.login = async (payload) => {
    const schema = Joi.object({
        email: Joi.string().email(),
        phoneNumber: Joi.string(),
        password: Joi.string().required()
    }).or("email", "phoneNumber");

    const {error} = schema.validate(payload, {
        allowUnknown: true,
    });

    if (error)
        return error.details[0].message.replace(/['"]/g, "");

    return null;
};
