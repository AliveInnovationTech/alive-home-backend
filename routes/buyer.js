"use strict";
const express = require("express");
const router = express.Router();
const controller = require("../app/controllers/BuyerController");
const { authenticateUser, authorizeRoles } = require("../lib/authMiddleware");

// Create buyer profile
router.post("/", authenticateUser,
    authorizeRoles("buyer"),
    controller.createBuyerProfile);


router.get("/", authenticateUser,
    authorizeRoles("admin", "superadmin"),
    controller.getAllBuyers);

// Get my buyer profile
router.get("/me", authenticateUser,
    authorizeRoles("buyer", "admin", "superadmin"),
    controller.getMyBuyerProfile);

// Get specific buyer profile
router.get("/:buyerId", authenticateUser,
    authorizeRoles("buyer", "admin", "superadmin"),
    controller.getBuyerProfile);

// Update buyer profile
router.put("/:buyerId", authenticateUser,
    authorizeRoles("buyer", "admin", "superadmin"),
    controller.updateBuyerProfile);


router.delete("/:buyerId", authenticateUser,
    authorizeRoles("buyer", "admin", "superadmin"),
    controller.deleteBuyerProfile);


router.patch("/:buyerId/pre-approval", authenticateUser,
    authorizeRoles("admin", "superadmin"),
    controller.updatePreApprovalStatus);


router.get("/:buyerId/properties", authenticateUser,
    authorizeRoles("buyer", "admin", "superadmin"),
    controller.searchProperties);

module.exports = router;
