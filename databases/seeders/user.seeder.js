"use strict";
const { Seeder } = require("mongoose-data-seed");
const dayjs = require("dayjs");
const  bcrypt = require("bcryptjs");
const UserModel = require("../../app/models/UserModel");
const RolesModel = require("../../app/models/RoleModel");
const {INITIAL_ROLES} = require("../../app/utils/constants")

const ROLES_TO_GRANT = [
    INITIAL_ROLES.SYSADMIN
];
const DEFAULT_USERS = [
    {
        "avatar": null,
        "name": "Mizala Super",
        "password": bcrypt.hashSync("Password12345", 10),
        "phoneNumber": "2348123456789",
        "email": "tech@mizala.co",
        "teams": ["mizala"],
        "phoneNumberVerifiedAt": dayjs().unix(),
        "emailVerifiedAt": dayjs().unix()
    }
]
class UserSeeder extends Seeder {

    async shouldRun() {
        return UserModel.countDocuments().exec().then(count => count === 0);
    }

    async run() {
        const rolesInUse = (await RolesModel.find({name: {$in: ROLES_TO_GRANT}, inUse: true})).map(({name}) => name);
        const users = DEFAULT_USERS.map(userObj => ({
            ...userObj,
            roles: rolesInUse
        }))
        return UserModel.create(users);
    }
}

module.exports = UserSeeder;
