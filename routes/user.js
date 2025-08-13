"use strict";
const express = require("express"); 
const router = express.Router();
const controller =require("../app/controllers/UserController")
const upload = require("../app/utils/upload")



router.post("/", controller.createUser);

router.get("/:userId", controller.getUserById);

router.get("/", controller.fetchAllUsers);

router.patch("/:userId", upload.single("profilePicture"), controller.updateUser);

router.delete("/:userId", controller.deleteUser);

module.exports = router;
