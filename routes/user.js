"use strict";
const express = require("express"); 
const router = express.Router();
const controller =require("../app/controllers/UserController")



router.post("/", controller.createUser);

router.get("/:userId", controller.getUserById);

router.get("/", controller.fetchAllUsers);

router.delete("/:userId", controller.deleteUser);

module.exports = router;
