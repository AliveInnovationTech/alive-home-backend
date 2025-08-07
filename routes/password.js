"use strict";
const router = require("express").Router();
const { gatekeeper } = require("mizala-gatekeeper");

//get controller
const passwordController = require("../app/controllers/PasswordController");

router.post("/reset", passwordController.sendResetPasswordCode);
router.post("/reset/code", passwordController.resetPassword);

router.post("/change", gatekeeper(), passwordController.change);
module.exports = router;
