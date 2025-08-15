"use strict";
const express = require("express");
const router = express.Router();
const controller = require("../app/controllers/DeveloperController");
const { authenticateUser, authorizeRoles } = require("../lib/authMiddleware");
const upload = require("../app/utils/docUploader")

// Create developer profile
router.post("/",
    authenticateUser,
    authorizeRoles('developer', 'admin', 'superadmin'),
    upload.single("companyLogoUrl"),
    controller.createDeveloperProfile);

// Get all developers with pagination and search
router.get("/",
    authenticateUser,
    authorizeRoles('admin', 'superadmin'),
    controller.getAllDevelopers);

// Get my developer profile
router.get("/me",
    authenticateUser,
    authorizeRoles('buyer', 'admin', 'superadmin'),
    controller.getMyDeveloperProfile);

// Get specific developer profile
router.get("/:developerId",
    controller.getDeveloperProfile);

// Update developer profile
router.put("/:developerId",
    authenticateUser,
    authorizeRoles('buyer', 'admin', 'superadmin'),
    controller.updateDeveloperProfile);

// Delete developer profile
router.delete("/:developerId",
    authenticateUser,
    authorizeRoles('admin', 'superadmin'),
    controller.deleteDeveloperProfile);

// Verify developer (admin and superadmin)
router.patch("/:developerId/verify",
    authenticateUser,
    authorizeRoles('admin', 'superadmin'),
    controller.verifyDeveloper);

module.exports = router;
