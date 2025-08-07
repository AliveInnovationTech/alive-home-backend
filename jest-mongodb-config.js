module.exports = {
    mongodbMemoryServerOptions: {
        autoStart: false,
        binary: {
            // Version of MongoDB
            skipMD5: true,
            version: "4.0.2",
        },
        instance: {
            dbName: "jest",
        },
    },
};
