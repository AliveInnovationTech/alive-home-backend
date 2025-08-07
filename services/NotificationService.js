"use strict";

const _axios = require("axios").create({
    baseURL: process.env.NOTIFICATION_SERVICE_URL || "http://notification-service",
    headers: {
        source: "internal"
    }
});


exports.sendSMS = async (recipient, message) => {
    try{
        const response = await _axios.post("/v1/sms", {
            message,
            recipients: [recipient]
        });

        console.log("Response", response.data);

        return response.data;
    }catch (e) {
        const error = resolveAxiosError(e);

        return {error: error?.raw?.error || error?.message || e.message};
    }
};

exports.createInAppNotification = async (payload) => {
    try{
        const response = await _axios.post("/v1/in-app-notifications", payload);

        console.log("Response", response.data);

        return response.data;
    }catch (e) {
        const error = resolveAxiosError(e);

        return {error: error?.raw?.error || error?.message || e.message};
    }
};


exports.sendTemplateEmail = async (payload) => {
    try{
        const response = await _axios.post("/v1/emails/template", payload);

        console.log("Response", response.data);

        return response.data;
    }catch (e) {
        const error = resolveAxiosError(e);

        return {error: error?.raw?.error || error?.message || e.message};
    }
};
