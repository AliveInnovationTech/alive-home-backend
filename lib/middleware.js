"use strict";
// const path = require("path");
const helmet = require("helmet");
const logger = require("morgan");
const cors = require("cors");
const mongoSanitize = require("express-mongo-sanitize");
const winstonLogger = require("../app/utils/logger");

module.exports = (app, express) => {
    app.set("trust proxy", true);
    app.use(cors());
    app.set(helmet());
    app.use(logger("dev"));
    
    // Raw body middleware for webhooks
    app.use('/api/v1/payments/webhooks', express.raw({ type: 'application/json' }));
    
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(mongoSanitize({
        onSanitize: ({ req, key }) => {
            winstonLogger.warn('Request sanitized', { sanitizedKey: key, requestBody: req.body });
        },
    }));
};
