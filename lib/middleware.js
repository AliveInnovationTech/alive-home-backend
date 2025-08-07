"use strict";
// const path = require("path");
const helmet = require("helmet");
const logger = require("morgan");
const cors = require("cors");
const mongoSanitize = require("express-mongo-sanitize");

module.exports = (app, express) => {
    app.set("trust proxy", true);
    app.use(cors());
    app.set(helmet());
    app.use(logger("dev"));
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(mongoSanitize({
        onSanitize: ({ req, key }) => {
            console.log(`This request[${key}] is sanitized`, req.body);
        },
    }));
};
