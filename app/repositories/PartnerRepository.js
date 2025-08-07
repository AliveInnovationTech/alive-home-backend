"use strict";
const randomString = require("crypto-random-string");

const Model = require("../models/PartnerModel");
const Repository = require("./MongoDBRepository");
const match = {
    development: "dev_",
    staging: "staging_",
    sandbox: "sandbox_",
    production: "live_"
};
class PartnerRepository extends Repository {
    constructor() {
        super(Model);
    }

    generateSecret() {
        return (match[process.env.NODE_ENV] || "test_") + randomString({
            length: 50,
            type: "base64"
        });
    }
}

module.exports = (new PartnerRepository());
