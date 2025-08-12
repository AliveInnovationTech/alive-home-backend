"use strict";
const express = require("express");
const router = express.Router();
const controller = require("../app/controllers/RealtorController");
const { authenticateUser, authorizeRoles } = require("../lib/authMiddleware");

// Create realtor profile
router.post("/", authenticateUser, controller.createRealtorProfile);

// Get all realtors with pagination, search, and filters
router.get("/", controller.getAllRealtors);

// Get my realtor profile
router.get("/me", authenticateUser, controller.getMyRealtorProfile);

// Get specific realtor profile
router.get("/:realtorId", controller.getRealtorProfile);

// Update realtor profile
router.put("/:realtorId", authenticateUser, controller.updateRealtorProfile);

// Delete realtor profile
router.delete("/:realtorId", authenticateUser, controller.deleteRealtorProfile);

// Verify realtor (admin only)
router.patch("/:realtorId/verify", authenticateUser, authorizeRoles('ADMIN'), controller.verifyRealtor);

// Upload verification documents
router.post("/:realtorId/documents", authenticateUser, controller.uploadVerificationDocuments);

// Get realtor statistics
router.get("/:realtorId/stats", controller.getRealtorStats);

module.exports = router;
