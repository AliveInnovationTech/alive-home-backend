"use strict";
const dayjs = require("dayjs");
const localizedFormat = require("dayjs/plugin/localizedFormat");
const { parse } = require("json2csv");
const flattenObject = require("flat");
const userRepository = require("../repositories/UserRepository");

const { resolveRequestQueryToMongoDBQuery } = require("../utils/helpers");
dayjs.extend(localizedFormat);


/**
 * @param objectToFlatten
 */
function flattenObjectWithUnderscore(objectToFlatten) {
    return flattenObject(objectToFlatten, {
        delimiter: "_",
        safe: true
    });
}

/**
 * @param user
 */

/**
 * @param query
 * @returns {Promise<{error, statusCode: number}|{data: {amount, id, status}, statusCode: number}|{data: {amount, invoiceId, payment: *, id, status}, statusCode: number}|{error: string, statusCode: number}>}
 */
exports.users = async (query) => {
    try {
        const mongoQuery = resolveRequestQueryToMongoDBQuery(query);

        // if (mongoQuery.filter.createdAt) {
        //     const startDate = mongoQuery.filter.createdAt.split(",");
        //     mongoQuery.filter.createdAt = {
        //         $gte: startDate[0],
        //         $lte: startDate[1]
        //     };
        // }


        console.log("mongoQuery", mongoQuery);

        const formattedUsers = [];
        let cursor = userRepository.getModel()
            .find(mongoQuery.filter)
            .sort(mongoQuery.sort)
            .cursor();

        for (let user = await cursor.next(); user != null; user = await cursor.next()) {
            formattedUsers.push(flattenObjectWithUnderscore(user.toJSON()));
            // formattedSubscriptions.push(subscription);
        }

        if(!formattedUsers.length) return {
            error: "No Matching Users",
            statusCode: 404
        };

        const fields = Object.keys(formattedUsers[0]);
        const opts = { fields };
        const csv = parse(formattedUsers, opts);
        console.log("Response Length", formattedUsers.length);

        return {
            data: csv,
            statusCode: 200
        };
    } catch (e) {
        console.log("error when exporting users", e);

        return {
            error: e.message,
            statusCode: 500
        };
    }
};
