"use strict";
const mongoose = require("mongoose");

const schema = mongoose.Schema({
    type: {
        type: String,
    },
    value: {
        type: String,
        index: true
    },
    code: {
        type: String,
        required: true,
        index: true,
    },
    expiry: {
        type: Number,
        index: true,
    },
    usedAt: {
        type: Number,
        index: true,
    },
}, {
    strict: false,
    timestamps: true
});

schema.index({
    type: 1,
    value: 1,
    code: 1,
    expiry: 1
});
module.exports = mongoose.model("verification_codes", schema);
