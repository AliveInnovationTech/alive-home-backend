"use strict";
const express = require("express");
const router = express.Router();
const controller = require("../app/controllers/BuyerController");
const { authenticateUser, authorizeRoles } = require("../lib/authMiddleware");

// Create buyer profile
router.post("/", authenticateUser,
    authorizeRoles("BUYER"),
    controller.createBuyerProfile);


router.get("/", authenticateUser,
    authorizeRoles("ADMIN", "SYSADMIN"),
    controller.getAllBuyers);

// Get my buyer profile
router.get("/me", authenticateUser,
    authorizeRoles("BUYER", "ADMIN", "SYSADMIN"),
    controller.getMyBuyerProfile);

// Get specific buyer profile
router.get("/:buyerId", authenticateUser,
    authorizeRoles("BUYER", "ADMIN", "SYSADMIN"),
    controller.getBuyerProfile);

// Update buyer profile
router.put("/:buyerId", authenticateUser,
    authorizeRoles("BUYER", "ADMIN", "SYSADMIN"),
    controller.updateBuyerProfile);


router.delete("/:buyerId", authenticateUser,
    authorizeRoles("ADMIN", "SYSADMIN"),
    controller.deleteBuyerProfile);


router.patch("/:buyerId/pre-approval", authenticateUser,
    authorizeRoles("BUYER","ADMIN", "SYSADMIN"),
    controller.updatePreApprovalStatus);


router.get("/:buyerId/properties", authenticateUser, controller.searchProperties);

module.exports = router;
