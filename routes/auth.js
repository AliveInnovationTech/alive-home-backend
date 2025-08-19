" use strict";
const express = require("express");
const router = express.Router();
const controller = require("../app/controllers/AuthController");


router.post("/login", controller.login);

router.get("/me/:userId", controller.me);

router.post("/forgot-password", controller.forgotPassword);

router.post("/reset-password/:userId/:token", controller.resetPassword);

router.post("/change-password/:userId", controller.changePassword);

module.exports = router;
