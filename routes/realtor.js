"use strict";
const express = require("express");
const router = express.Router();
const controller = require("../app/controllers/RealtorController");
const { authenticateUser, authorizeRoles } = require("../lib/authMiddleware");
const upload = require("../app/utils/docUploader")

// Create realtor profile
router.post("/", authenticateUser, controller.createRealtorProfile);

// Get all realtors with pagination, search, and filters
router.get("/",
    authenticateUser,
    authorizeRoles('admin', 'superadmin'),
    controller.getAllRealtors);

// Get my realtor profile
router.get("/me",
    authenticateUser,
    authorizeRoles('buyer', 'admin', 'superadmin'),
    controller.getMyRealtorProfile);

// Get specific realtor profile
router.get("/:realtorId", controller.getRealtorProfile);

// Update realtor profile
router.put("/:realtorId",
    authenticateUser,
    authorizeRoles('admin', 'superadmin'),
    controller.updateRealtorProfile);

// Delete realtor profile
router.delete("/:realtorId",
    authenticateUser,
    authorizeRoles('admin', 'superadmin'),
    controller.deleteRealtorProfile);

// Verify realtor (admin only)
router.patch("/:realtorId/verify",
    authenticateUser,
    authorizeRoles('admin', 'superadmin'),
    controller.verifyRealtor);

// Upload verification documents
router.post("/:realtorId/documents",
    authenticateUser,
    authorizeRoles('buyer', 'admin', 'superadmin'),
    upload.array("verificationDocsUrls", 5),
    controller.uploadVerificationDocuments);

// Get realtor statistics
router.get("/:realtorId/stats",
    authenticateUser,
    authorizeRoles('admin', 'superadmin'),
    controller.getRealtorStats);

module.exports = router;
