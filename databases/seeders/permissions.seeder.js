"use strict";
const { Seeder } = require("mongoose-data-seed");
const PermissionModel = require("../../app/models/PermissionModel");
const { INITIAL_PERMISSIONS } = require("../../app/utils/constants");

class PermissionsSeeder extends Seeder {

    async shouldRun() {
        return PermissionModel.countDocuments()
            .exec()
            .then(count => count === 0);
    }

    async run() {
        return PermissionModel.create(Object.values(INITIAL_PERMISSIONS)
            .map(perm => ({
                name: perm.replaceAll("_", " "),
                slug: perm
            })));
    }
}

module.exports = PermissionsSeeder;
