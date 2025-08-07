"use strict";

const User = require("../models/UserModel");
const Repository = require("./MongoDBRepository");

class UserRepository extends Repository {
    constructor() {
        super(User);
    }

    nonUpdateField() {
        return ["_id", "access", "deletedAt", "createdAt", "updatedAt"];
    }
}

module.exports = (new UserRepository());
