"use strict";
const express = require("express");
const router = express.Router();
const controller = require("../app/controllers/HomeOwnerController");
const { authenticateUser, authorizeRoles } = require("../lib/authMiddleware");
const upload = require("../app/utils/docUploader")

// Create homeowner profile
router.post("/",
    authenticateUser,
    controller.createHomeOwnerProfile);

// Get all homeowners with pagination and search
router.get("/",
    authenticateUser,
    authorizeRoles('admin', 'superadmin'),
    controller.getAllHomeOwners);

// Get my homeowner profile
router.get("/me", authenticateUser, controller.getMyHomeOwnerProfile);

// Get specific homeowner profile
router.get("/:ownerId", controller.getHomeOwnerProfile);

// Update homeowner profile
router.put("/:ownerId",
    authenticateUser,
    authorizeRoles('buyer', 'admin', 'superadmin'),
    controller.updateHomeOwnerProfile);

// Delete homeowner profile
router.delete("/:ownerId",
    authenticateUser,
    authorizeRoles('admin', 'superadmin'),
    controller.deleteHomeOwnerProfile);

// Verify homeowner (admin only)
router.patch("/:ownerId/verify",
    authenticateUser,
    authorizeRoles('admin', 'superadmin'),
    controller.verifyHomeOwner);

// Upload verification documents
router.post("/:ownerId/documents",
    authenticateUser,
    authorizeRoles('buyer', 'admin', 'superadmin'),
    upload.array("verificationDocsUrls", 5),
    controller.uploadVerificationDocuments);
    

module.exports = router;

