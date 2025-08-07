"use strict";
const router = require("express")
    .Router();

const verifyRouter = require("./auth/verify");
const { gatekeeper } = require("mizala-gatekeeper");
//get controller
const authController = require("../app/controllers/AuthController");

/* Special route handlers forming basis for API auth (authentication and authorization) */
router.post("/validate-user-access", authController.validateUserAccess);
router.post("/validate-partner-access", authController.validatePartnerAccess);
// special route 

router.use("/verify", verifyRouter);

router.post("/login", authController.login);

router.post("/token/refresh", authController.refresh);

router.get("/me", gatekeeper(), authController.me);

module.exports = router;
