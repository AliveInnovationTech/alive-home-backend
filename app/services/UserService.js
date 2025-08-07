"use strict";
const bcrypt = require("bcryptjs");
const dayjs = require("dayjs");
const logger = require("mizala-logger");
const { isEmpty } = require("lodash");
const {
    EVENT,
    ROLES,
} = require("../utils/constants");

const userRepository = require("../repositories/UserRepository");
const userValidation = require("../validators/UserValidator");
const verificationService = require("../services/VerificationService");
const userEvents = require("../events/UserEvent");

const { resolveRequestQueryToMongoDBQuery } = require("../utils/helpers");
const { formatPhoneNumber } = require("tm-utils");

exports.createUser = async (body, contextUser) => {
    try {
        if (!body.email) body.email = `${body.phoneNumber}@mizala.co`;

        body.email = body.email.toLowerCase();

        const validationError = await userValidation.createUser(body);

        if (validationError) {
            logger.error("Unable to create user", {
                validationError,
                body,
            });

            return {
                statusCode: 422,
                error: validationError
            };
        }

        let user = {
            ...body,
            password: body.password ? bcrypt.hashSync(body.password, 10) : null,
        };

        if (!isEmpty(contextUser)) {
            user.referrer = contextUser.role;
            user.referrerId = contextUser.userId;
        }

        if (body.agentId && !user.referrer) {
            user.referrer = ROLES.AGENT;
            user.referrerId = body.agentId;
        }

        if (body.verificationToken) {
            const verificationData = await verificationService.resolveVerificationToken(body.verificationToken);

            if (verificationData) {
                user = {
                    ...user,
                    ...verificationData
                };
            }
        }

        delete user.verificationToken;

        user = await userRepository.create(user);

        user = user.toJSON();
        user.verificationToken = body.verificationToken;

        userEvents.emit(EVENT.USER.CREATED, user);

        return {
            data: user,
            statusCode: 201
        };
    } catch (e) {
        console.log("error when creating user", e);

        delete body.password;

        logger.exception(e, {
            message: "Unable to create user",
            body
        });

        return {
            error: e.message,
            statusCode: 500
        };
    }
};

exports.findUser = async (userId) => {
    let user = await userRepository.findOne({
        _id: userId,
    });

    if (!user) {
        return {
            error: "We could not find this user on this platform.",
            statusCode: 404
        };
    }

    return {
        data: user,
        statusCode: 200
    };
};

exports.fetchAllUsers = async (requestParams) => {
    const {
        filter,
        limit,
        page,
        sort
    } = resolveRequestQueryToMongoDBQuery(requestParams);

    delete filter.roles;

    if (filter.userId) {
        filter.$or = [{ _id: filter.userId }, { referrerId: filter.userId }];

        delete filter.userId;
    }

    const users = await userRepository.all(filter, sort, page, limit);

    return {
        data: users,
        statusCode: 200
    };
};

exports.updateUser = async (userId, payload, contextUser, requestSource) => {
    if (requestSource !== "internal" && contextUser.userId !== userId) {
        return {
            error: "You are not authorized to make this update!!!",
            statusCode: 403
        };
    }

    // console.log("ContextUser", contextUser, userId);

    let user = await userRepository.findOne({
        _id: userId
    });

    if (!user) {
        return {
            error: "Oops!!! We are unable to get this user details on the platform.",
            statusCode: 404
        };
    }
    //update auth

    let userUpdate = {};

    // const meta
    let nonUpdateField = userRepository.nonUpdateField();

    for (let key in payload) {
        if (!payload.hasOwnProperty(key)) {
            continue;
        }

        //check if its not in an non update field
        if (nonUpdateField.includes(key)) {
            continue;
        }

        userUpdate[key] = payload[key];
    }

    if (requestSource !== "internal") {
        delete userUpdate.email;
        delete userUpdate.phoneNumber;
        delete userUpdate.role;
    }

    console.log("User", user, userUpdate, requestSource);

    await user.updateOne(userUpdate);
    // console.log("User", user, userUpdate);
    userEvents.emit(EVENT.USER.UPDATED, userId);

    return {
        data: userId,
        statusCode: 202
    };
};

exports.deleteUser = async (userId) => {
    let user = await userRepository.findOne({
        _id: userId,
    });

    if (!user) {
        return {
            error: "We could not find this user on this platform.",
            statusCode: 404
        };
    }

    await userRepository.update({
        _id: userId,
    }, {
        deletedAt: dayjs()
            .unix()
    });

    userEvents.emit(EVENT.USER.DELETED, userId);

    return {
        data: userId,
        statusCode: 202
    };
};

exports.metrics = async (clientId, payload) => {
    const {
        filter,
    } = resolveRequestQueryToMongoDBQuery(payload);

    filter.clientId = clientId;

    //query = {email: "..."}
    const totalUsersCount = await userRepository.count({ clientId });
    let filteredUsersCount = totalUsersCount;

    console.log("Query", filter);

    if (!isEmpty(filter.createdAt)) {
        filteredUsersCount = await userRepository.count(filter);
    }

    return {
        data: {
            totalUsersCount,
            filteredUsersCount
        },
        statusCode: 200
    };
};

exports.check = async (query) => {
    const checks = {
        exists: false,
        phoneNumberVerified: false,
        emailVerified: false,
        hasPassword: false,
    };

    if (!query.phoneNumber && !query.email) {
        return {
            data: checks,
            statusCode: 200
        };
    }

    //once you are logged in, the userId will be passed, so we are going to delete the userId
    delete query.userId;

    const user = await userRepository.findOne(query);

    if (!user) {
        return {
            data: checks,
            statusCode: 200
        };
    }

    checks.exists = true;
    checks.emailVerified = !!user.emailVerifiedAt;
    checks.phoneNumberVerified = !!user.phoneNumberVerifiedAt;
    checks.hasPassword = !!user.password;

    return {
        data: checks,
        statusCode: 200
    };
};

exports.findByType = async (requestSource, type, value) => {
    if (requestSource !== "internal") {
        return {
            error: "Oops, you are not authorised to access this resource!!!",
            statusCode: 403
        };
    }

    if (type === "phoneNumber") value = formatPhoneNumber(value);

    const user = await userRepository.findOne({ [type]: value });

    if (!user) {
        return {
            error: "Oops! User Not found",
            statusCode: 404
        };
    }

    return {
        data: user,
        statusCode: 200
    };
};

exports.findOrCreate = async (type, value, payload) => {
    const supportedFilterType = ["email", "phoneNumber"];

    if (!supportedFilterType.includes(type)) {
        return {
            error: "Invalid Type. [email, phoneNumber] are supported",
            statusCode: 422
        };
    }

    if (!value) {
        return {
            error: "Type Value is required",
            statusCode: 422
        };
    }

    if (type === "phoneNumber") {
        value = formatPhoneNumber(value);
    }

    payload[type] = value;

    let user = await userRepository.findOne({
        [type]: value.toLowerCase()
    });

    if (!isEmpty(user)) {
        user = user.toJSON();
        // if (payload.withToken) {
        //     console.log("User Exists, generating token");
        //
        //     user.access = await authService.generateTokens(user, client);
        // }

        // delete payload.withToken;

        if (payload.password) payload.password = bcrypt.hashSync(payload.password, 10);

        user = await userRepository.findOneAndUpdate({ _id: user.userId }, payload);

        return {
            data: user,
            statusCode: 200
        };
    }

    console.log("============== Creating User =================");
    const {
        error,
        data,
        statusCode
    } = await this.createUser({
        ...payload,
        [type]: value,
    });

    console.log("Creating User Response", data, "Error", error);
    if (error) {
        return {
            error,
            statusCode
        };
    }

    // if (payload.withToken) {
    //     console.log("User Created, generating token");
    //     if (isEmpty(payload.client)) {
    //         payload.client = await clientRepository.findById(clientId);
    //     }
    //     console.log("User Exists, Client", !!payload.client);
    //     data.access = await authService.generateTokens(data, payload.client);
    // }

    return {
        data,
        statusCode: 201
    };
};
