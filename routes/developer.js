"use strict";
const express = require("express");
const router = express.Router();
const controller = require("../app/controllers/DeveloperController");
const { authenticateUser, authorizeRoles } = require("../lib/authMiddleware");

// Create developer profile
router.post("/", authenticateUser, controller.createDeveloperProfile);

// Get all developers with pagination and search
router.get("/", controller.getAllDevelopers);

// Get my developer profile
router.get("/me", authenticateUser, controller.getMyDeveloperProfile);

// Get specific developer profile
router.get("/:developerId", controller.getDeveloperProfile);

// Update developer profile
router.put("/:developerId", authenticateUser, controller.updateDeveloperProfile);

// Delete developer profile
router.delete("/:developerId", authenticateUser, controller.deleteDeveloperProfile);

// Verify developer (admin only)
router.patch("/:developerId/verify", authenticateUser, authorizeRoles('ADMIN'), controller.verifyDeveloper);

module.exports = router;
