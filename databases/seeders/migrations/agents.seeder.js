"use strict";
const fs = require("fs");

const { Seeder } = require("mongoose-data-seed");

const { formatPhoneNumber } = require("tm-utils");
const { ROLE } = require("../../../app/utils/constants");
const userRepository = require("../../../app/repositories/UserRepository");
class AgentSeeder extends Seeder {

    async shouldRun() {
        return true;
    }

    async run() {
        const agents = JSON.parse(fs.readFileSync("agents.json"));
        // console.log("users", JSON.parse(users));

        const formattedAgents =[];
        for(let agent of agents){
            const formattedAgent = {
                oldPlatformId: agent.id,
                role: ROLE.AGENT,
                firstName: agent.firstname?.toLowerCase(),
                lastName: agent.lastname?.toLowerCase(),
                name: `${agent.firstname} ${agent.lastname}`?.toLowerCase(),
                phoneNumber: formatPhoneNumber(agent.phonenumber, "NG"),
                email: agent.email?.toLowerCase(),
                password: agent.password,
                company: agent.company?.toLowerCase(),
                createdAt: agent.createdAt,
                updatedAt: agent.updatedAt,
                referralCode: agent.refCode,
            };


            formattedAgents.push(formattedAgent);
        }

        return userRepository.massInsert(formattedAgents);
        // return formattedUsers.length;
    }
}

module.exports = AgentSeeder;
