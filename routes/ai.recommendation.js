"use strict";
const express = require("express");
const router = express.Router();
const controller = require("../app/controllers/AIRecommendationController")
const { authenticateUser, authorizeRoles } = require("../lib/authMiddleware");

router.post("/generate/:userId", 
    authenticateUser, authorizeRoles("USER", "ADMIN", "SYSADMIN", "BUYER"), controller.generatePersonalizedRecommendations);

router.get("/user/:userId/recommendations", 
    authenticateUser, authorizeRoles("USER", "ADMIN", "SYSADMIN", "BUYER"), controller.getUserRecommendations);

router.put("/user/:userId/recommendation/:recommendationId", 
    authenticateUser, authorizeRoles("USER", "ADMIN", "SYSADMIN", "BUYER"), controller.updateRecommendationStatus);

router.get("/user/:userId/analytics", 
    authenticateUser, authorizeRoles("USER", "ADMIN", "SYSADMIN", "BUYER"), controller.getRecommendationAnalytics);

module.exports = router;
