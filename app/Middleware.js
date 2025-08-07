"use strict";
const logger = require("mizala-logger");
const response = require("../app/utils/responses");

exports.decodeHeaders = (req, res, next) => {
    try{
        res.user = req.headers.user && JSON.parse(req.headers.user);
        res.contextUser = req.headers["context-user"] && JSON.parse(req.headers["context-user"]);
    }catch (e){
        logger.exception(e, {
            user: req.headers.user,
            contextUser: req.headers["context-user"]
        });
    }

    return next();
};


exports.internal = (req, res, next) => {
    if(req.headers?.source !== "internal") {
        return response.error(res, "You are not authorised to carry out this action", 403);
    }

    return next();
};
