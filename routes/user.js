"use strict";
const express = require("express");
const router = express.Router();
const controller = require("../app/controllers/UserController")
const upload = require("../app/utils/upload")
const { authenticateUser, authorizeRoles } = require("../lib/authMiddleware")




router.post("/create", controller.createUser);

router.get("/:userId", controller.getUserById);

router.get("/",
    authenticateUser,
    authorizeRoles("ADMIN", "SYSADMIN"),
    controller.fetchAllUsers);

router.put("/:userId",
    authenticateUser,
    authorizeRoles("HOMEOWNER", "DEVELOPER",
        "REALTOR", "BUYER", "ADMIN",
        "SYSADMIN"),
    upload.single("profilePicture"), controller.updateUser);

router.delete("/:userId",
    authenticateUser,
    authorizeRoles("ADMIN", "SYSADMIN"),
    controller.deleteUser);

module.exports = router;
