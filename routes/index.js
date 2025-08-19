"use strict";

require("express-async-errors");
const home = require("./home");

module.exports = (app) => {
    app.use("/", home);
    app.use("/api/v1/auths", require("./auth"));
    app.use("/api/v1/users", require("./user"));
    app.use("/api/v1/developers", require("./developer"));
    app.use("/api/v1/homeowners", require("./homeowner"));
    app.use("/api/v1/buyers", require("./buyer"));
    app.use("/api/v1/realtors", require("./realtor"));
    app.use("/api/v1/payments", require("./payment"));
    app.use("/api/v1/properties", require("./property"));
    app.use("/api/v1/ai-recommendations", require("./ai.recommendation"));


};
