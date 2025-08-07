"use strict";
const fs = require("fs");

const { Seeder } = require("mongoose-data-seed");

const dayjs = require("dayjs");
const { formatPhoneNumber } = require("tm-utils");
const { ROLE } = require("../../../app/utils/constants");
const userRepository = require("../../../app/repositories/UserRepository");
const partnerRepository = require("../../../app/repositories/PartnerRepository");
const partnerService = require("../../../app/services/PartnerService");
class UsersSeeder extends Seeder {

    async shouldRun() {
        return true;
    }

    async run() {
        const users = JSON.parse(fs.readFileSync("users.json"));
        // console.log("users", JSON.parse(users));

        const formattedUsers =[]; const oldPlatformIds = [];

        for(let user of users){
            const formattedUser = {
                oldPlatformId: user.id,
                role: ROLE.USER,
                firstName: user.firstname?.toLowerCase(),
                lastName: user.lastname?.toLowerCase(),
                name: `${user.firstname} ${user.lastname}`?.toLowerCase(),
                bvn: user.bvn,
                phoneNumber: formatPhoneNumber(user.phonenumber, "NG"),
                countryCode: "ng",
                email: user.email?.toLowerCase(),
                password: user.password,
                country: user.country?.toLowerCase(),
                state: user.state?.toLowerCase(),
                lga: user.lga?.toLowerCase(),
                address: user.address?.toLowerCase(),
                monoId: user.mono_id,
                cv: user.cv,
                govtId: user.govt_id,
                avatar: user.govt_id,
                utilityBill: user.utility_bill,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            };

            if (user.dob) {
                const dob = dayjs(user.dob, "YYYY-MM-DD");

                console.log("DOB", dob, dob.month(), dob.date(), dob.year());

                formattedUsers.dob = user.dob;
                if (dob.isValid()) {
                    formattedUser.birthday = {
                        day: dob.date(),
                        month: dob.month() + 1,
                        year: dob.year()
                    };
                }
            }

            if(user.source){
                let partner = await partnerRepository.findOne({partnerId: user.source});

                if (!partner) partner = await partnerService.createPartner({
                    name: user.source,
                    user:{
                        email: user.source + "@mizala.co"
                    }
                });

                formattedUser.referrer = "partner";
                formattedUser.referrerId = partner.partnerId;
                formattedUser.oldSource = user.source;


                console.log("User", user, partner);
            }

            formattedUsers.push(formattedUser);
            oldPlatformIds.push(user.id);
        }
        await userRepository.massInsert(formattedUsers);

        const insertedUsers = await userRepository.all({
            oldPlatformId: {$in: oldPlatformIds}
        });

        const userObject = {};
        insertedUsers.forEach(user => {
            user = user.toJSON();
            userObject[user.oldPlatformId] = user;
        });

        fs.writeFileSync("./usergroup.json", Buffer.from(JSON.stringify(userObject)));

        return  insertedUsers;
        // return formattedUsers.length;
    }
}

module.exports = UsersSeeder;
