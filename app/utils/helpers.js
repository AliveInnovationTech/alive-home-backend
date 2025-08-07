"use strict";
const Joi = require("joi");
const dayjs = require("dayjs");

const {isEmpty} = require("lodash");
const jwt = require("jsonwebtoken");
const dataToBeRemovedArray = ["", null, undefined];

/**
 * @param {object} value
 * @returns {object}
 */
function removeFieldsWithEmptyValue(value) {
    const objectTobeWorkingOn = {...value};

    if(typeof value != "object") return value;

    for (const key in objectTobeWorkingOn) {
        if(dataToBeRemovedArray.includes(objectTobeWorkingOn[key])){
            delete objectTobeWorkingOn[key];
            continue;
        }

        if(Array.isArray(objectTobeWorkingOn[key])){
            objectTobeWorkingOn[key] = objectTobeWorkingOn[key].map(removeFieldsWithEmptyValue);
            continue;
        }

        if(typeof objectTobeWorkingOn[key] === "object"){
            objectTobeWorkingOn[key] = removeFieldsWithEmptyValue(objectTobeWorkingOn[key]);
        }
    }

    return objectTobeWorkingOn;
}
exports.removeFieldsWithEmptyValue = removeFieldsWithEmptyValue;
exports.isEmpty = isEmpty;

/**
 * @param {object} schema
 * @param {object} payload
 * @param {object} options
 * @returns {string|null}
 */
exports.validate = (schema, payload) => {
    schema = Joi.object(schema);
    const {error} = schema.validate(payload, {
        allowUnknown: true,
    });

    if (error)
        return error.details[0].message.replace(/['"]/g, "");

    return null;
};

/**
 * @param {object} requestQuery
 * @returns {{filter: {}, limit: number, page: number, sort: {_id: number}}}
 */
exports.resolveRequestQueryToMongoDBQuery = (requestQuery) => {
    const response = {
        page: 1,
        limit: 50,
        filter: {},
        sort: { _id: -1 }
    };

    for (const key in requestQuery) {
        if (!requestQuery.hasOwnProperty(key)) {
            continue;
        }

        if (key === "page") {
            response.page = parseInt(requestQuery[key]);
            continue;
        }

        if (key === "limit") {
            response.limit = parseInt(requestQuery[key]);
            continue;
        }

        if (key === "sort") {
            const [sortKey, sortValue] = requestQuery[key].split(",");
            response.sort = { [sortKey]: sortValue || -1 };
            continue;
        }

        if (key === "dateFrom") {
            response.filter.createdAt = {
                ...response.filter.createdAt,
                $gte: dayjs(requestQuery[key] || new Date(), "DD-MM-YYYY")
                    .startOf("day")
            };
            continue;
        }

        if (key === "dateTo") {
            response.filter.createdAt = {
                ...response.filter.createdAt,
                $lte: dayjs(requestQuery[key] || new Date(), "DD-MM-YYYY")
                    .endOf("day")
            };
            continue;
        }

        if (key === "q") {
            response.filter.$text = {
                $search: new RegExp(requestQuery[key], "gi"),
                $caseSensitive: false,
                $diacriticSensitive: false
            };

            continue;
        }

        if (requestQuery[key]) response.filter[key] = requestQuery[key];
    }

    return response;
};


exports.generateJWT = (payload, key) => {
    return jwt.sign(payload, key || process.env.DEFAULT_SECURITY_KEY);
};

exports.verifyJWT = (payload, key) => {
    return jwt.verify(payload, key || process.env.SECURITY_TOKEN);
};
