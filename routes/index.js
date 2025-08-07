"use strict";

require("express-async-errors");
const home = require("./home");

module.exports = (app) => {
    app.use("/", home);
    app.use("/health-check", require("../app/controllers/AppController").healthCheck);
    app.use("/v1/auths/", require("./auth"));

    app.use("/v1/users/", require("./user"));
    app.use("/v1/passwords/", require("./password"));
    app.use("/v1/partners/", require("./partner"));
    app.use("/v1/exports/", require("./export"));
};
