"use strict";
const express = require("express");
const router = express.Router();
const controller = require("../app/controllers/HomeOwnerController");
const { authenticateUser, authorizeRoles } = require("../lib/authMiddleware");

// Create homeowner profile
router.post("/", authenticateUser, controller.createHomeOwnerProfile);

// Get all homeowners with pagination and search
router.get("/", controller.getAllHomeOwners);

// Get my homeowner profile
router.get("/me", authenticateUser, controller.getMyHomeOwnerProfile);

// Get specific homeowner profile
router.get("/:ownerId", controller.getHomeOwnerProfile);

// Update homeowner profile
router.put("/:ownerId", authenticateUser, controller.updateHomeOwnerProfile);

// Delete homeowner profile
router.delete("/:ownerId", authenticateUser, controller.deleteHomeOwnerProfile);

// Verify homeowner (admin only)
router.patch("/:ownerId/verify", authenticateUser, authorizeRoles('ADMIN'), controller.verifyHomeOwner);

// Upload verification documents
router.post("/:ownerId/documents", authenticateUser, controller.uploadVerificationDocuments);

module.exports = router;
