"use strict";
const userRepository = require("../repositories/UserRepository");
const userEvent = require("../events/UserEvent");
const {EVENT} = require("../utils/constants");
const { removeFieldsWithEmptyValue } = require("../utils/helpers");
exports.resolveUserCreated = async (payload) => {
    console.log("resolveUserCreated", payload);

    const { data } = payload;

    data.oldId = data.id;
    data.address = data.residentialAddress;
    delete data.id;

    console.log("data", data);

    const user = await userRepository.create(data);
    userEvent.emit(EVENT.USER.CREATED, user.toJSON());

    return { data: user._id };
};

exports.resolveUserUpdated = async (payload) => {
    console.log("resolveUserUpdated", payload);

    const { data } = payload;

    data.oldId = data.id;
    delete data.id;
    console.log("data", data);

    delete data.email;
    delete data.phoneNumber;

    const user = await userRepository.findOneAndUpdate({
        oldId: data.oldId
    }, removeFieldsWithEmptyValue(data));

    if(!user) return {data: "User Does Not Exists"};

    userEvent.emit(EVENT.USER.UPDATED, user.toJSON());

    return { data: user._id };
};
