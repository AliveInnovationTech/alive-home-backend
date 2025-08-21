"use strict";
const express = require("express");
const router = express.Router();
const controller = require("../app/controllers/HomeOwnerController");
const { authenticateUser, authorizeRoles } = require("../lib/authMiddleware");
const upload = require("../app/utils/docUploader")

// Create homeowner profile
router.post("/",
    authenticateUser,
    authorizeRoles("HOMEOWNER"),
    controller.createHomeOwnerProfile);

// Get all homeowners with pagination and search
router.get("/",
    authenticateUser,
    authorizeRoles('ADMIN', 'SYSADMIN'),
    controller.getAllHomeOwners);

// Get my homeowner profile
router.get("/me",
    authenticateUser,
    authorizeRoles("HOMEOWNER", "ADMIN", "SYSADMIN"),
    controller.getMyHomeOwnerProfile);

// Get specific homeowner profile
router.get("/:ownerId",
    authenticateUser,
    authorizeRoles("HOMEOWNER", "ADMIN", "SYSADMIN"),
    controller.getHomeOwnerProfile);

// Update homeowner profile
router.put("/:ownerId",
    authenticateUser,
    authorizeRoles("HOMEOWNER", "ADMIN", "SYSADMIN"),
    controller.updateHomeOwnerProfile);

// Delete homeowner profile
router.delete("/:ownerId",
    authenticateUser,
    authorizeRoles('ADMIN', 'SYSADMIN'),
    controller.deleteHomeOwnerProfile);

// Verify homeowner (admin only)
router.patch("/:ownerId/verify",
    authenticateUser,
    authorizeRoles("ADMIN", "SYSADMIN"),
    controller.verifyHomeOwner);

// Upload verification documents
router.post("/:ownerId/documents",
    authenticateUser,
    authorizeRoles("HOMEOWNER", "ADMIN", "SYSADMIN"),
    upload.array("verificationDocsUrls", 5),
    controller.uploadVerificationDocuments);


module.exports = router;

