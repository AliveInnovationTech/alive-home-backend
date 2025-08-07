"use strict";
const mongoose = require("mongoose");
const logger = require("mizala-logger");

const {
    EVENT,
    ROLES,
} = require("../utils/constants");

const userService = require("../services/UserService");
const partnerRepository = require("../repositories/PartnerRepository");
const userRepository = require("../repositories/UserRepository");
const partnerValidator = require("../validators/PartnerValidator");
const partnerEvent = require("../events/PartnerEvent");

const { resolveRequestQueryToMongoDBQuery } = require("../utils/helpers");
exports.createPartner = async (body) => {
    try {
        let validationError = await partnerValidator.createPartner(body);

        if (validationError) {
            return {
                statusCode: 422,
                error: validationError
            };
        }

        const partnerId = body.name.replace(/[^\w\s]/gi, "")
            .replace(/\s/g, "")
            .toLowerCase();

        const partnerCheck = await partnerRepository.count({ partnerId });

        if (partnerCheck) {
            return {
                error: "Partner Exists",
                statusCode: 422
            };
        }

        const partnerBody = {
            _id: mongoose.Types.ObjectId(),
            name: body.name,
            logo: body.logo,
            partnerId: body.name.replace(/[^\w\s]/gi, "")
                .replace(" ", "")
                .toLowerCase(),
            secret: partnerRepository.generateSecret(),
            billingType:  body.billingType,
            postpaidWalletThreshold: body.postpaidWalletThreshold || 0
        };


        let user = undefined;

        if(!body.userId){
            const {
                error,
                data,
                statusCode
            } = await userService.createUser({
                name: body.name,
                email: body.email,
                phoneNumber: body.phoneNumber,
                role: ROLES.PARTNER,
                partnerId: partnerBody.partnerId,
                referrer: ROLES.PARTNER,
                referrerId: partnerBody.partnerId,
                avatar: body.logo
            });

            if (error) {
                return {
                    error,
                    statusCode
                };
            }

            delete data.permissions; // since we're persisting createUser response payload
            user = data;
        }else{
            user = await userRepository.findById(body.userId);

            if(!user) return {
                error: "User attached to partner data can not be found",
                statusCode: 404
            };

            user = user.toJSON();

            await userService.updateUser(body.userId, { role: ROLES.PARTNER }, {userId: body.userId}, "internal");
        }

        partnerBody.userId = user.userId;
        partnerBody.user = user;

        let partner = await partnerRepository.create(partnerBody);
        partner = partner.toJSON();
        partner.secret = partnerBody.secret;

        partnerEvent.emit(EVENT.PARTNER.CREATED, partner);

        return {
            data: partner,
            statusCode: 201
        };
    } catch (e) {
        console.log("error when creating partner", e);
        delete body.user.password;
        logger.critical("Unable to create partner", body, e.stack);

        return {
            error: e.message,
            statusCode: 500
        };
    }
};

exports.findPartner = async (partnerId) => {
    const query = {};

    if (mongoose.isValidObjectId(partnerId)) query._id = partnerId;
    else query.partnerId = partnerId;

    let partner = await partnerRepository.findOne(query);

    if (!partner) {
        return {
            error: "We could not find this user on this platform.",
            statusCode: 404
        };
    }

    return {
        data: partner,
        statusCode: 200
    };
};

exports.fetchAll = async (requestParams) => {
    const {
        filter,
        limit,
        page,
        sort
    } = resolveRequestQueryToMongoDBQuery(requestParams);

    const users = await partnerRepository.all(filter, sort, page, limit);

    return {
        data: users,
        statusCode: 200
    };
};

exports.updatePartner = async (partnerId, update) => {
    let validationError = await partnerValidator.updatePartner(update);

    if (validationError) {
        return {
            statusCode: 422,
            error: validationError
        };
    }

    let { error, data: partner, statusCode } = await this.findPartner(partnerId);

    if (error) {
        return {
            error,
            statusCode: statusCode
        };
    }
    //update auth

    await partnerRepository.update({
        _id: partner.id,
    }, {
        status: update.status,
        billingType: update.billingType || partner.billingType,
        name: update.name || partner.name,
        logo: update.logo || partner.logo
    });

    partnerEvent.emit(EVENT.PARTNER.UPDATED, partner.id);

    return {
        data: partnerId,
        statusCode: 202
    };
};
