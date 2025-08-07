"use strict";
const repository = require("../repositories/UserRepository");
const response = require("../utils/responses");
const {TOPIC} = require("../utils/constants");

exports.healthCheck = async (req, res) => {
    try{
        //1. Check DB
        //2. Check Redis
        //3. Check Queue

        const healthCheck = {
            uptime: process.uptime(),
            database: false,
            queue: false,
            timestamp: Date.now()
        };

        //DB
        await repository.findOne({});
        healthCheck.database = true;


        //Queue
        await broker.publish(TOPIC.HEALTH_CHECK, TOPIC.USERS, {userService: true});
        healthCheck.queue = true;


        //Redis Check


        return response.success(res, healthCheck);
    }catch (e) {
        return response.error(res, e.message);
    }
};
