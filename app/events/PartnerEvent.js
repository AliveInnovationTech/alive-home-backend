"use strict";
const EventEmitter = require("events");
const dayjs = require("dayjs");
const localizedFormat = require("dayjs/plugin/localizedFormat");

const listener = new EventEmitter();

const { TOPIC, EVENT } = require("../utils/constants");
const partnerRepository = require("../repositories/PartnerRepository");

dayjs.extend(localizedFormat);


listener.on(EVENT.PARTNER.CREATED, async (partner) => {
    try{
        const eventPayload = {
            event: EVENT.PARTNER.CREATED,
            data: partner
        };
        console.log("PARTNER CREATED EVENT GENERATED");

        if(!broker) throw Error("Broker is not defined");
        delete eventPayload.data?.password;
        const response = await broker.publish(TOPIC.USERS, TOPIC.USERS, eventPayload);
        console.log("===========Kafka Partner Created Event Published==================", response);
    }catch (error){
        //TODO: log error,
        console.log("Error: ", error);
    }
    // generate a kafka event
});

listener.on(EVENT.PARTNER.UPDATED, async (partnerId) => {
    try{
        const partner = await partnerRepository.findById(partnerId);

        const eventPayload = {
            event: EVENT.PARTNER.UPDATED,
            data: partner.toJSON()
        };
        console.log("PARTNER UPDATED EVENT GENERATED");

        if(!broker) throw Error("Broker is not defined");

        const response = await broker.publish(TOPIC.USERS, TOPIC.USERS, eventPayload);
        console.log("===========Kafka Partner Updated Event Published==================", response);
    }catch (error){
        //TODO: log error,
        console.log("Error: ", error);
    }
});

console.log("============= Partners Events Loaded ===============");

module.exports = listener;
