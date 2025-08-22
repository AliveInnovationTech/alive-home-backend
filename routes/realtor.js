"use strict";
const express = require("express");
const router = express.Router();
const controller = require("../app/controllers/RealtorController");
const { authenticateUser, authorizeRoles } = require("../lib/authMiddleware");
const upload = require("../app/utils/docUploader")

// Create realtor profile
router.post("/", authenticateUser,
    authorizeRoles("REALTOR"),
     controller.createRealtorProfile);

// Get all realtors with pagination, search, and filters
router.get("/",
    authenticateUser,
    authorizeRoles("REALTOR","ADMIN", "SYSADMIN"),
    controller.getAllRealtors);

// Get my realtor profile
router.get("/me",
    authenticateUser,
    authorizeRoles("REALTOR", "ADMIN", "SYSADMIN"),
    controller.getMyRealtorProfile);

// Get specific realtor profile
router.get("/:realtorId",
    authenticateUser,
    authorizeRoles("REALTOR", "ADMIN", "SYSADMIN"),
     controller.getRealtorProfile);

// Update realtor profile
router.put("/:realtorId",
    authenticateUser,
    authorizeRoles("REALTOR","ADMIN", "SYSADMIN"),
    controller.updateRealtorProfile);

// Delete realtor profile
router.delete("/:realtorId",
    authenticateUser,
    authorizeRoles("ADMIN", "SYSADMIN"),
    controller.deleteRealtorProfile);

// Verify realtor (admin only)
router.patch("/:realtorId/verify",
    authenticateUser,
    authorizeRoles("ADMIN", "SYSADMIN"),
    controller.verifyRealtor);

// Upload verification documents
router.post("/:realtorId/documents",
    authenticateUser,
    authorizeRoles("REALTOR", "ADMIN", "SYSADMIN"),
    upload.array("verificationDocsUrls", 5),
    controller.uploadVerificationDocuments);

// Get realtor statistics
router.get("/:realtorId/stats",
    authenticateUser,
    authorizeRoles("BUYER","REALTOR","ADMIN", "SYSADMIN"),
    controller.getRealtorStats);

module.exports = router;
