"use strict";
try {
    require("dotenv").config({});
    const logger = require("mizala-logger");

    global.isProduction = process.env.NODE_ENV === "production";
    require("../lib");

    const migrationWorker = require("../app/workers/MigrationWorker");
    const {
        TOPIC
    } = require("../app/utils/constants");

    const eventsMapping = {
        "migration.user.created": migrationWorker.resolveUserCreated,
        "migration.user.updated": migrationWorker.resolveUserUpdated,
    };

    const supportedEvents = Object.keys(eventsMapping);

    const errorLogger = async (queue, error, payload) => {
        logger.exception(error, payload);

        console.log("Error", error);

        await broker.publish(TOPIC.USERS_DEAD_LETTER, TOPIC.USERS_DEAD_LETTER, {
            queue: queue,
            reason: error?.message || error,
            payload
        });
        console.log("================ Completed Events With Error ===============");
        // process.exit(1);
    };

    const resolveQueuePayload = async () => {
        const topics = [];

        if(!topics.length) return;

        broker.listen(topics, TOPIC.USERS, async (error, message, args) => {
            if (error) {
                console.log(`Error ${args.topic}`, error);
                throw Error(error);
                // return;
            }
            console.log("Listening resolveQueuePayload");
            try {
                const payload = JSON.parse(message);
                console.log("payload Event", payload.event);
                if (!supportedEvents.includes(payload.event)) {
                    console.log("Incompatible Events: ", payload.event, supportedEvents);

                    return;
                }

                const response = await eventsMapping[payload.event](payload);

                if (response?.error) {
                    await errorLogger(args.topic, response.error, payload);
                }
                console.log("================Completed Events Without Error===============");
            } catch (e) {
                errorLogger(args.topic, e, JSON.parse(message));
            }
        }, true, Number(process.env.QUEUE_PREFETCH || 5));
    };

    (async () => {
        try {
            await require("../lib/queue")((broker) => {
                console.log("Background Queue Connected");
                //Main Queue entry point
                resolveQueuePayload(broker)
                    .catch(console.log);

                // if(!deactivatedQueues.includes(QUEUE.DEAD_LETTER))
                //     broker.requeueDeadLetter(QUEUE.DEAD_LETTER, {noAck: false, prefetch: 50});
            });
        } catch (e) {
            console.log("=========== Unable to Initialize Background Queue =============");
            process.exit(1);
        }
    })();
} catch (e) {
    console.log("Background Init Error", e);
    // process.exit(1);
}
