"use strict";
const router = require("express").Router();

//get controller
const verificationController = require("../../app/controllers/VerificationController");

router.post("/", verificationController.verifyByType);
router.post("/code", verificationController.verifyCode);

module.exports = router;
