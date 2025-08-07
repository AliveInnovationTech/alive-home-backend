"use strict";
const Kafka = require("message-broker-lib").Kafka;
const logger = require("mizala-logger");

const broker = new Kafka();

const { TOPIC } = require("../app/utils/constants");

module.exports = async (callback) => {
    try {
        console.log("Kafka", process.env.KAFKA_CLUSTER_URL);
        await broker.init({
            name: process.env.APP_NAME,
            heartbeat: 5,
        });

        const topics = [
            TOPIC.HEALTH_CHECK,
            TOPIC.USERS,
            TOPIC.USERS_DEAD_LETTER
        ];

        let result = await broker.createTopics(topics.map(topic => {
            return {
                name: topic,
                numPartitions: Number(process.env.KAFKA_NO_OF_PARTITIONS || 1),
                replicationFactor: Number(process.env.KAFKA_REPLICATION_FACTOR || 6),
                retentionPolicy: "10000"
            };
        }));

        if (result.error) throw Error(result.error);

        result = await broker.createProducer();

        if (result.error) throw Error(result.error);

        global.broker = broker;

        console.log("===== kafka Connected ====");
        callback && callback(broker);

        return broker;
    } catch (e) {
        console.log(e);

        logger.exception(e, {
            "critical": "Unable to connect to queue",
            url: process.env.KAFKA_CLUSTER_URL
        });

        await broker.close();
        throw e;
        // process.exit(1);
    }
};
