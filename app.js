"use strict";
require("dotenv").config({});
require("mizala-logger");

global.isProduction = process.env.NODE_ENV === "production";
global.isDevelopment = process.env.NODE_ENV === "development";
global.isStaging = process.env.NODE_ENV === "staging";
const {StatusCodes} = require("http-status-codes");

let express = require("express");
require("express-async-errors");
let app = express();
const createError = require("http-errors");
require("./lib")(app, express);
const {formatPhoneNumber} = require("tm-utils");
const logger = require("./app/utils/logger");



app.use((req, res, next) => {
    try{
        let phoneNumber = req.body.phoneNumber || req.query.phoneNumber || req.params.phoneNumber;
        res.countryCode = req.body.countryCode || req.query.countryCode || req.params.countryCode;
        if (!phoneNumber) return next();

        req.body.phoneNumber = req.query.phoneNumber = req.params.phoneNumber = formatPhoneNumber(phoneNumber, res?.countryCode || "NG");

        return next();
    }catch (e){
        logger.error("Phone number formatting error", { error: e.message });

        return next();
    }
});

//routes
require("./routes")(app);


// catch 404 and forward to error handler
app.use((err, req, res, next) => {
    return res.status(err.status || StatusCodes.NOT_FOUND)
        .json({error: err.message});
});

// error handler
app.use((err, req, res, next) => {
    logger.error("Unhandled application error", { error: err.message, stack: err.stack });
    res.status(err.status || StatusCodes.INTERNAL_SERVER_ERROR)
        .json({error: err.message});
});


module.exports = app;
