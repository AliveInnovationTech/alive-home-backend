"use strict";
const express = require("express");
const router = express.Router();
const controller = require("../app/controllers/AIRecommendationController")
const { authenticateUser, authorizeRoles } = require("../lib/authMiddleware");

router.post("/generate/:userId", 
    authenticateUser, authorizeRoles("user", "admin","sysadmin"), controller.generatePersonalizedRecommendations);

router.get("/user/:userId/recommendations", 
    authenticateUser, authorizeRoles("user", "admin","sysadmin"), controller.getUserRecommendations);

router.put("/user/:userId/recommendation/:recommendationId", 
    authenticateUser, authorizeRoles("user", "admin","sysadmin"), controller.updateRecommendationStatus);

router.get("/user/:userId/analytics", 
    authenticateUser, authorizeRoles("user", "admin","sysadmin"), controller.getRecommendationAnalytics);

module.exports = router;
