"use strict";
const dayjs = require("dayjs");
const bcrypt = require("bcryptjs");
const uuid = require("uuid/v4");

const userRepository = require("../repositories/UserRepository");
const partnerRepository = require("../repositories/PartnerRepository");
const authValidator = require("../validators/AuthValidator");
const userEvents = require("../events/UserEvent");
const { EVENT, RESPONSE_MESSAGES } = require("../utils/constants");

const {
    generateJWT,
    verifyJWT
} = require("../utils/helpers");

exports.generateTokens = async (user, type = "auth") => {
    const secret = process.env.SECURITY_TOKEN;
    const tokenExpiry = dayjs().add(12, "hour").unix();

    let token = generateJWT({
        userId: user.userId || user._id,
        // TODO: inject session info here
        type,
        exp: tokenExpiry,
        data: user.userId || user._id
    }, secret);

    const refreshExpiry = dayjs()
        .add(1, "day")
        .unix();

    let refresh = generateJWT({
        exp: refreshExpiry,
        data: user.userId || user._id,
        type,
        mode: "refresh"
    }, secret);

    return {
        token,
        tokenExpiry,
        refreshExpiry,
        refresh
    };
};

exports.login = async (payload) => {
    const validationError = await authValidator.login(payload);

    if (validationError) {
        return {
            error: validationError,
            statusCode: 422
        };
    }

    const query = {};

    if (payload.phoneNumber) query.phoneNumber = payload.phoneNumber;

    if (payload.email) query.email = payload.email;

    let user = await userRepository.findOne(query);


    if (!user) {
        console.log("user not found");

        return {
            error: "Invalid Credentials",
            statusCode: 401
        };
    }

    if (!user.password) {
        console.log("password not found");

        return {
            error: "Invalid Credentials",
            statusCode: 401
        };
    }

    const check = bcrypt.compareSync(payload.password, user.password);

    if (!check) {
        console.log("password is not correct");

        return {
            error: "Invalid Credentials",
            statusCode: 401
        };
    }

    let {
        token,
        tokenExpiry,
        refreshExpiry,
        refresh
    } = await this.generateTokens(user);

    await userRepository.update({_id: user.userId}, {lastLoginAt: new Date()});

    userEvents.emit(EVENT.USER.LOGIN, user.toJSON(), {
        requestId: payload.requestId || uuid(),
        headers: payload.headers,
        deviceInformation: {
            ...payload.deviceInformation || {},
            //ip: payload.ip,
        },
    });

    return {
        data: {
            actionType: "logged-in",
            user,
            token,
            tokenExpiry,
            refreshTokenExpiry: refreshExpiry,
            refresh
        }
    };
};

exports.me = async (payload) => {
    return {
        data: payload.user,
        statusCode: 200
    };
};

exports.refresh = async (payload) => {
    if (!payload.refresh) {
        return {
            error: "Refresh Token Not Found",
            statusCode: 404
        };
    }

    let decoded = verifyJWT(payload.refresh, payload.client?.secret);

    if (!decoded) {
        return {
            error: "Failed to authenticate token...",
            statusCode: 401
        };
    }

    let auth = await userRepository.findById(decoded.data);

    if (!auth) {
        return {
            error: "User Not Found",
            statusCode: 404
        };
    }

    let {
        token,
        refresh,
        tokenExpiry,
        refreshExpiry,
    } = await this.generateTokens(auth, payload.client);

    return {
        data: {
            user: auth,
            token,
            tokenExpiry,
            refreshTokenExpiry: refreshExpiry,
            refresh
        }
    };
};

exports.validateUserAccess = async (payload) => {
    try {
        const response = {};

        let decoded = verifyJWT(payload.token, process.env.SECURITY_TOKEN);

        if (!decoded) {
            return {
                error: "Failed to authenticate token...",
                statusCode: 401
            };
        }

        response.user = await userRepository.findById({
            _id: decoded.data
        });

        if (!response.user) {
            return {
                error: "User not found",
                statusCode: 404
            };
        }

        response.user = {
            userId: response.user._id,
            name: response.user.name,
            role: response.user.role || "user",
            teams: response.user.teams,
            avatar: response.user.avatar,
            email: response.user.email,
            phoneNumber: response.user.phoneNumber,
            referrer: response.user.referrer,
            referrerId: response.user.referrerId
        };

        response.authenticationType = "jwt";
        response.userId = response.user.userId;

        return { data: response };
    } catch (error) {
        console.log("Error", error);

        return { error: error.message };
    }
};

exports.validatePartnerAccess = async (payload) => {
    try {
        if(!payload.partnerId || !payload.partnerSecret) return {
            error: RESPONSE_MESSAGES.UNAUTHORIZED_ERROR,
            statusCode: 403
        };

        let response = await partnerRepository.findOne({partnerId: payload.partnerId});

        if (!response) {
            return {
                error: RESPONSE_MESSAGES.UNAUTHORIZED_ERROR,
                statusCode: 403
            };
        }

        response = response.toJSON();
        response.authenticationType = "partner-secret";

        return { data: response };
    } catch (error) {
        console.log("Error", error);

        return { error: error.message };
    }
};
