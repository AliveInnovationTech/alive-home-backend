" use strict";
const express = require("express");
const router = express.Router();
const controller = require("../app/controllers/AuthController");


router.post("/login", controller.login);

router.get("/me", controller.me);

router.post("/forgot-password", controller.forgotPassword);

router.post("/reset-password/:userId/:token", controller.resetPassword);

router.post("/update-password", controller.updatePassword);

module.exports = router;
