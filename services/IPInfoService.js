"use strict";
const _axios = require("axios");

exports.getIPDetails = async (ip) => {
    try {
        const response = await _axios.get(`https://ipinfo.io/${ip}?token=1494317cf80df9`);

        console.log("Response data", response.data);

        return {data: response.data};
    } catch (e) {
        const error = resolveAxiosError(e);

        return { error: error?.raw?.error || error?.message || e.message,
            data: {} };
    }
};
