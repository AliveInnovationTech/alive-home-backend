"use strict";
const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate");

const schema = mongoose.Schema({
    name: {
        type: String,
        required: true,
        index: true,
        unique: true,
        dropDups: true,
    },
    hierarchyLevel: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: true,
    },
    inUse: {
        type: Boolean,
        allowNull: false,
        default: true
    },
    permissions: [String]
}, {
    timestamps: true
});

schema.plugin(mongoosePaginate);
module.exports = mongoose.model("roles", schema);
