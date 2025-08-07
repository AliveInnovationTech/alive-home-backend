"use strict";
const mongoose = require("mongoose");
const dayjs = require("dayjs");
const mongoosePaginate = require("mongoose-paginate");
const { STATUS } = require("../utils/constants");

const schema = mongoose.Schema({
    role: {
        type: String,
        required: true,
        index: true,
        default: "user",
    },
    email: {
        type: String,
        index: true
    },
    phoneNumber: {
        type: String,
        index: true
    },
    countryCode: {
        type: String,
        default: "ng"
    },
    name: {
        type: String,
        required: true
    },
    firstName: {
        type: String,
    },
    status: {
        type: String,
        required: true,
        default: STATUS.ACTIVE,
    },
    password: {
        type: String,
    },
    avatar: {
        type: String,
        default: null
    },
    birthday: {
        day: {
            default: null,
            type: Number,
        },
        month: {
            default: null,
            type: Number,
        },
        year: {
            default: null,
            type: Number,
        },
    },
    referrer: {
        type: String
    },
    referrerId: {
        type: String
    },
    agentId: {
        type: String,
        index: true
    },
    address: {
        type: String,
    },
    emailVerifiedAt: { type: Number },
    phoneNumberVerifiedAt: { type: Number },
    lastLoginIp: { type: String },
    lastLoginAt: { type: Date },
    deletedAt: { type: Number },
}, {
    toJSON: {
        transform: function (_, ret) {
            ret.id = ret._id.toString();
            ret.userId = ret._id.toString();
            ret.createdAt = dayjs(ret.createdAt)
                .unix();
            ret.updatedAt = dayjs(ret.updatedAt)
                .unix();
            ret.hasPassword = !!ret.password;

            delete ret.__v;
            delete ret.password;
            delete ret._id;
            delete ret.roles;
            delete ret.teams;
        }
    },
    strict: false,
    timestamps: true
});

schema.index({ "$**": "text" });
schema.plugin(mongoosePaginate);
module.exports = mongoose.model("users", schema);
