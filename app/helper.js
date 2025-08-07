"use strict";

const jwt = require("jsonwebtoken");
const Joi = require("joi");
const dayjs = require("dayjs");


global.createSuccessResponse = (res, data, code = 200, isPaginated = false) => {
    if (isPaginated || (data?.docs)) {
        data.data = data.docs || data.data;
        delete data.docs;
        res.response = "Paginated Response";
        data.page = parseInt(data.page);

        return res.status(code)
            .json(data);
    }
    res.response = data;

    return res.status(code)
        .json({ data });
};

global.paginatedResponse = (res, data, code = 200) => {
    data.data = data.docs;
    delete data.docs;
    res.response = "Paginated Response";
    data.page = parseInt(data.page);

    return res.status(code)
        .json(data);
};

global.createErrorResponse = (res, error = "Oops. An Error Occurred", code = 500) => {
    console.log("Error Response", error);
    res.response = error;

    return res.status(code)
        .json({ error: error });
};

exports.handleAxiosError = error => {
    try {
        if (error && error.response) {
            return {
                status: error.response.status,
                statusText: error.response.statusText,
                message: error.response.data.error,
                url: error.response.config.url,
                params: error.response.config.params,
                data: error.response.config.data,
                headers: error.response.headers
            };
        }

        return {
            status: 500,
            statusText: error.message || "Unknown Error",
            message: error.message || "Oops, An Error Occurred",
            stack: error.stack
        };
    } catch (ex) {
        return {
            status: 500,
            statusText: "Unknown Error",
            message: "Oops, An Error Occurred",
            error: ex.message,
            stack: ex.stack
        };
    }
};

exports.generateJWT = (payload, key) => {
    // console.log("data", payload, "key", key, "default", process.env.DEFAULT_SECURITY_KEY);
    return jwt.sign(payload, key || process.env.DEFAULT_SECURITY_KEY);
};

exports.verifyJWT = (payload, key) => {
    console.log(payload, "key", key, "default", process.env.SECURITY_TOKEN);

    return jwt.verify(payload, key || process.env.SECURITY_TOKEN);
};

exports.validate = (schema, payload) => {
    schema = Joi.object(schema);
    const { error } = schema.validate(payload, {
        allowUnknown: true,
    });

    if (error) {
        return error.details[0].message.replace(/['"]/g, "");
    }

    return null;
};

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

        // TODO: convert if nightmare below to switch (more efficient, reduce cognitive complexity[30 to the 15])
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
                $gte: dayjs(requestQuery[key] || new Date(), "DD-MM-YYYY")
                    .startOf("day")
                    .unix()
            };
        }

        if (key === "dateTo") {
            response.filter.createdAt = {
                $lte: dayjs(requestQuery[key] || new Date(), "DD-MM-YYYY")
                    .endOf("day")
                    .unix()
            };
        }

        if (key.endsWith("From") && key != "dateFrom") {
            const field = response.filter[key.replace(/From/i, "")] || {};
            field["$gte"] = dayjs(requestQuery[key] || new Date(), "YYYY-MM-DD")
                .startOf("day").unix();
            response.filter[key.replace(/From/i, "")] = field;
            delete requestQuery[`${key}`];
        }

        if (key.endsWith("To") && key != "dateTo") {
            const field = response.filter[key.replace(/To/i, "")] || {};
            field["$lte"] = dayjs(requestQuery[key] || new Date(), "YYYY-MM-DD")
                .startOf("day").unix();
            response.filter[key.replace(/To/i, "")] = field;
            delete requestQuery[`${key}`];
        }

        if (key === "q") {
            response.filter.$text = {
                $search: requestQuery[key],
                $caseSensitive: false
            };

            continue;
        }

        if (requestQuery[key]) response.filter[key] = requestQuery[key];
    }

    return response;
};




// switch (key) {
//     case "page":
//         response.page = parseInt(requestQuery[key]);
//         break;

//     case "limit":
//         response.limit = parseInt(requestQuery[key]);
//         break;

//     case "sort":
//         const [sortKey, sortValue] = requestQuery[key].split(",");
//         response.sort = { [sortKey]: sortValue || -1 };
//         break;

//     case "dateFrom":
//         response.filter.createdAt = {
//             $gte: dayjs(requestQuery[key] || new Date(), "DD-MM-YYYY")
//                 .startOf("day")
//                 .unix()
//         };
//         break;

//     case "dateTo":
//         response.filter.createdAt = {
//             $lte: dayjs(requestQuery[key] || new Date(), "DD-MM-YYYY")
//                 .endOf("day")
//                 .unix()
//         };
//         break;

//     case "q":
//         response.filter.$text = {
//             $search: requestQuery[key],
//             $caseSensitive: false
//         };
//         break;

//     default:
//         response.filter[key] = requestQuery[key]
//         break;
// }

// // TODO: convert to cases...
// if (key.endsWith("From") && key != "dateFrom") {
//     const field = response.filter[key.replace(/From/i, '')] || {};
//     field['$gte'] = dayjs(requestQuery[key] || new Date(), "YYYY-MM-DD")
//         .startOf("day").unix();
//     response.filter[key.replace(/From/i, '')] = field;
//     delete requestQuery[`${key}`];
// }

// if (key.endsWith("To") && key != "dateTo") {
//     const field = response.filter[key.replace(/To/i, '')] || {};
//     field['$lte'] = dayjs(requestQuery[key] || new Date(), "YYYY-MM-DD")
//         .startOf("day").unix();
//     response.filter[key.replace(/To/i, '')] = field;
//     delete requestQuery[`${key}`];
// }
