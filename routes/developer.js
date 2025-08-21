"use strict";
const express = require("express");
const router = express.Router();
const controller = require("../app/controllers/DeveloperController");
const { authenticateUser, authorizeRoles } = require("../lib/authMiddleware");
const upload = require("../app/utils/docUploader")

// Create developer profile
router.post("/",
    authenticateUser,
    authorizeRoles("DEVELOPER"),
    upload.single("companyLogoUrl"),
    controller.createDeveloperProfile);

// Get all developers with pagination and search
router.get("/",
    authenticateUser,
    authorizeRoles("ADMIN", "SYSADMIN"),
    controller.getAllDevelopers);

// Get my developer profile
router.get("/me",
    authenticateUser,
    authorizeRoles("DEVELOPER", "ADMIN", "SYSADMIN"),
    controller.getMyDeveloperProfile);

// Get specific developer profile
router.get("/:developerId",
    authenticateUser,
    authorizeRoles("DEVELOPER", "ADMIN", "SYSADMIN"),
    controller.getDeveloperProfile);

// Update developer profile
router.put("/:developerId",
    authenticateUser,
    authorizeRoles("DEVELOPER", "ADMIN", "SYSADMIN"),
    controller.updateDeveloperProfile);

// Delete developer profile
router.delete("/:developerId",
    authenticateUser,
    authorizeRoles("ADMIN", "SYSADMIN"),
    controller.deleteDeveloperProfile);

// Verify developer (admin and sysadmin)
router.patch("/:developerId/verify",
    authenticateUser,
    authorizeRoles("ADMIN", "SYSADMIN"),
    controller.verifyDeveloper);

module.exports = router;
