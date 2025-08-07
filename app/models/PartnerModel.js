"use strict";
const mongoose = require("mongoose");
const dayjs = require("dayjs");
const mongoosePaginate = require("mongoose-paginate");
const { STATUS, PARTNER } = require("../utils/constants");
const schema = mongoose.Schema({
    name: {
        type: String,
        required: true,
        index: true,
    },
    logo: {
        type: String,
    },
    partnerId: {
        type: String,
        required: true,
        index: true,
        unique: true
    },
    secret: {
        type: String,
        required: true,
    },
    billingType: {
        type: String,
        required: true,
        default: PARTNER.BILLING_TYPE.PREPAID
    },
    user: {
        type: Object,
    },
    status: {
        type: String,
        required: true,
        default: STATUS.ACTIVE
    },
    deletedAt: { type: Number },
}, {
    toJSON: {
        transform: function (doc, ret) {
            ret.id = ret._id.toString();
            ret.createdAt = dayjs(ret.createdAt)
                .unix();
            ret.updatedAt = dayjs(ret.updatedAt)
                .unix();

            delete ret.secret;
            delete ret.__v;
            delete ret.password;
            delete ret._id;
        }
    },
    strict: false,
    timestamps: true
});

schema.plugin(mongoosePaginate);
module.exports = mongoose.model("partners", schema);
