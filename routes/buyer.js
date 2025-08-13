"use strict";
const express = require("express");
const router = express.Router();
const controller = require("../app/controllers/BuyerController");
const { authenticateUser, authorizeRoles } = require("../lib/authMiddleware");

// Create buyer profile
router.post("/", authenticateUser, controller.createBuyerProfile);

// Get all buyers with pagination, search, and filters
router.get("/", controller.getAllBuyers);

// Get my buyer profile
router.get("/me", authenticateUser, controller.getMyBuyerProfile);

// Get specific buyer profile
router.get("/:buyerId", controller.getBuyerProfile);

// Update buyer profile
router.put("/:buyerId", authenticateUser, controller.updateBuyerProfile);

// Delete buyer profile
router.delete("/:buyerId", authenticateUser, controller.deleteBuyerProfile);

// Update pre-approval status
router.patch("/:buyerId/pre-approval", authenticateUser, controller.updatePreApprovalStatus);

// Search properties for buyer
router.get("/:buyerId/properties", authenticateUser, controller.searchProperties);

module.exports = router;
