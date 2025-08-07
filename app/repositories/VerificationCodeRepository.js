"use strict";

const Model = require("../models/VerificationCodeModel");
const Repository = require("./MongoDBRepository");

class VerificationCodeRepository extends Repository {
    constructor() {
        super(Model);
    }

}

module.exports = (new VerificationCodeRepository());
