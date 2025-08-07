"use strict";

const Role = require("../models/RoleModel");
const Repository = require("./MongoDBRepository");

class RoleRepository extends Repository {
    constructor() {
        super(Role);
    }

    // nonUpdateField() {
    //     return ["_id"];
    // }
}

module.exports = (new RoleRepository());
