"use strict";

require("express-async-errors");
const home = require("./home");

module.exports = (app) => {
    app.use("/", home);
    app.use("/api/v1/auth", require("./auth"));
    app.use("/api/v1/users", require("./user"));
    app.use("/api/v1/developers", require("./developer"));
    app.use("/api/v1/homeowners", require("./homeowner"));


};
