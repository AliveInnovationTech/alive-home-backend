"use strict";

const { Seeder } = require("mongoose-data-seed");

const { isEmpty } = require("lodash");
const userRepository = require("../../../app/repositories/UserRepository");

class UsersSeeder extends Seeder {

    async shouldRun() {
        return true;
    }

    async run() {
        const users = await userRepository.all({});

        const updatesToPerform = [];
        users.forEach(user => {
            const conditions = {};
            const role = user.get("role");

            if (!user.roles || isEmpty(user.roles)) {
                conditions["roles"] = [role ?? "user"];
            }
            if (!user.teams || user.referrer == "partner") {
                conditions["teams"] = [user.referrerId];
            } else {
                conditions["teams"] = user.teams;
            }

            if (!isEmpty(conditions)) {
                updatesToPerform.push({
                    updateOne: {
                        "filter": { "_id": user._id },
                        "update": !role ? { $set: conditions } : {
                            $unset: { role: "" },
                            $set: conditions
                        }
                    }
                });
            }
        });

        if (updatesToPerform.length > 0) {
            return userRepository.getModel()
                .bulkWrite(updatesToPerform);
        } else {
            return 0;
        }
    }
}

module.exports = UsersSeeder;
