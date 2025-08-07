"use strict";
const EventEmitter = require("events");
const dayjs = require("dayjs");
const logger = require("mizala-logger");
const userRepository = require("../repositories/UserRepository");

const {
    TOPIC,
    EVENT,
} = require("../utils/constants");

const notificationService = require("../../services/NotificationService");
const IPInfoService = require("../../services/IPInfoService");

const localizedFormat = require("dayjs/plugin/localizedFormat");
const { isEmpty } = require("lodash");
dayjs.extend(localizedFormat);

const listener = new EventEmitter();

listener.on(EVENT.USER.CREATED, async (user) => {
    const eventPayload = {
        event: EVENT.USER.CREATED,
        data: user
    };
    console.log("USER CREATED EVENT GENERATED");
    // generate a kafka event
    setImmediate(async () => {
        delete eventPayload.data?.password;
        const response = await broker.publish(TOPIC.USERS, TOPIC.USERS, eventPayload);
        console.log("===========Kafka USER Event Published==================", response);
    });

    //Send Email
    setImmediate(async () => {
        if (!user.email) return;

        const firstName = user.firstName || user.name.split(" ")[0];

        notificationService.sendTemplateEmail({
            "subject": `Welcome to Mizala, ${firstName}🎉`,
            "recipients": [user.email],
            "data": {
                "salutation": `Hello ${firstName},`,
                "message": [
                    "Thank you for activating your account on Mizala. On behalf of the team, I welcome you to a smarter way to protect you, your loved ones and properties. <br/>",
                    "At Mizala, our goal is to simplify the process of getting insurance claims through technology and thereby protecting you and your insured properties.",
                    "<br/> Mizala makes your life easier with affordable, flexible & accessible insurance.",
                    "<br/><br/> MARCEL OKORIE, CEO",

                ],
            },
        })
            .catch(err => logger.exception(err, {
                tag: "send-email",
                userId: user.userId,
            }));
    });    //Send Email

    //Create In-app-notifications
    setImmediate(async () => {
        const smsPayload = {
            userId: user.userId,
            message: "Thank you for signing up on Mizala.\n\nWe can't wait to create magic with you. ",
            event: EVENT.USER.CREATED,
            service: process.env.APP_NAME,
        };

        notificationService.createInAppNotification(smsPayload)
            .catch(err => logger.exception(err, {
                userId: user.userId,
                event: "sign-up-create-in-app-notification"
            }));
    });
});

listener.on(EVENT.USER.UPDATED, async (user) => {
    const eventPayload = {
        event: EVENT.USER.UPDATED,
        data: user
    };
    console.log("USER UPDATED EVENT GENERATED");
    // generate a kafka event
    setImmediate(async () => {
        delete eventPayload.data?.password;
        const response = await broker.publish(TOPIC.USERS, TOPIC.USERS, eventPayload);
        console.log("===========Kafka USER Updated Event Published==================", response);
    });
});


listener.on(EVENT.USER.LOGIN, async (user, options = {}) => {
    //Send Email
    setImmediate(async () => {
        if (!user.email) return;

        const ip  = options.deviceInformation?.ip || options.headers["x-real-ip"];


        if(ip === user.lastLoginIp) {
            console.log("Logged In from Same IP");

            return;
        }

        const { error, data: location } =  await IPInfoService.getIPDetails(ip);
        console.log("Location", error,  location,ip);
        const firstName = user.firstName || user.name.split(" ")[0];


        const deviceInfoMessage = [];
        for (let key in options.deviceInformation) {
            deviceInfoMessage.push(`${key.toLowerCase()}: <b>${options.deviceInformation[key]}</b>`);
        }

        if(!isEmpty(location)){
            deviceInfoMessage.push(`city: <b>${location.city}</b>`);
            deviceInfoMessage.push(`country: <b>${location.region}, ${location.country}</b>`);
            deviceInfoMessage.push(`timezone: <b>${location.timezone}</b>`);
            deviceInfoMessage.push(`org/network: <b>${location.org}</b>`);
        }


        console.log("deviceInfoMessage", deviceInfoMessage);
        notificationService.sendTemplateEmail({
            "subject": "Login Alert 🔒",
            "recipients": [user.email],
            "data": {
                "message": [
                    `Hi ${firstName},`,
                    `You just logged into your account from this  IP <b> ${ip} on ${dayjs().format("LLLL")}</b>. <br/>`,
                    deviceInfoMessage.join("<br/>"),

                    "If you didn't do this, we strongly recommend that you reset your password or call any of our customer care line below for more inquiries.<br/>",
                    "<br/>Customer Care Lines: <br/>+234 705 536 2778 Rahmat<br/>+234 702 655 8362 Bayo<br/>+234 704 175 0153 Rebecca<br/><br/>Mizala cares",
                ],
            },
        })
            .catch(err => logger.exception(err, {
                userId: user.userId,
            }));

        console.log("User", user);
        await userRepository.update({_id: user.userId}, {lastLoginIp: ip});
    });    //Send Email

    //Create In-app-notifications
    setImmediate(async () => {
        if (!user.email) return;

        const ip  = options.deviceInformation?.ip || options.headers["x-real-ip"];


        if(ip === user.lastLoginIp) {
            console.log("Logged In from Same IP");

            return;
        }
        notificationService.createInAppNotification({
            userId: user.userId,
            message: "Welcome back, " + user.name,
            event: EVENT.USER.LOGIN,
            service: process.env.APP_NAME,
        })
            .catch(err => logger.exception(err, {
                userId: user.userId,
            }));
    });
});

listener.on(EVENT.PASSWORD.CHANGED, async (user, hasOldPassword) => {
    //generate a rabbitMQ event
    // setImmediate(async () => {
    //     const eventPayload = {
    //         event: EVENT.PASSWORD.CHANGED,
    //         data: {
    //             clientId: user.clientId,
    //             userId: user.userId,
    //             email: user.email,
    //             phoneNumber: user.phoneNumber,
    //             name: user.name,
    //             changedAt: dayjs()
    //                 .unix(),
    //             hasOldPassword: hasOldPassword ? "yes" : "no"
    //         }
    //     };
    //     delete eventPayload.data?.password;
    //     const response = await broker.publish(EVENT.PASSWORD.CHANGED, TOPIC.USERS, eventPayload);
    //     console.log("=========== USER.PASSWORD.CHANGED Event Published==================", response, JSON.stringify(eventPayload));
    // });
    console.log("USER PASSWORD CHANGED EVENT GENERATED", user, hasOldPassword);
});

console.log("============= User Events Loaded ===============");

module.exports = listener;
