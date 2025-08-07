"use strict";
require("dotenv").config({});
require("mizala-logger");

global.isProduction = process.env.NODE_ENV === "production";
global.isDevelopment = process.env.NODE_ENV === "development";
global.isStaging = process.env.NODE_ENV === "staging";

let express = require("express");
require("express-async-errors");
let app = express();
const createError = require("http-errors");
require("./lib")(app, express);
const {formatPhoneNumber} = require("tm-utils");



app.use((req, res, next) => {
    try{
        let phoneNumber = req.body.phoneNumber || req.query.phoneNumber || req.params.phoneNumber;
        res.countryCode = req.body.countryCode || req.query.countryCode || req.params.countryCode;
        if (!phoneNumber) return next();

        req.body.phoneNumber = req.query.phoneNumber = req.params.phoneNumber = formatPhoneNumber(phoneNumber, res?.countryCode || "NG");

        return next();
    }catch (e){
        console.log("EformatPhoneNumber", e);

        return next();
    }
});

//routes
require("./routes")(app);


// catch 404 and forward to error handler
app.use((req, res, next) => {
    return next(createError(404));
});


// error handler
app.use((err, req, res) => {
    console.log("Unhandled Error", err);
    res.status(err.status || 500).json({error: err.message});
});

module.exports = app;
