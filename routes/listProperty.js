"use strict"
const express = require("express");
const router = express.Router();
const controller = require("../app/controllers/PropertyListingController")
const { authenticateUser, authorizeRoles } = require("../lib/authMiddleware")



router.post("/:propertyId/listing",
    authenticateUser,
    authorizeRoles("ADMIN", "REALTOR", "DEVELOPER", "HOMEOWNER", "SYSADMIN"),
    controller.createListing);



router.get("/role/listings",
    authenticateUser,
    authorizeRoles("ADMIN", "REALTOR", "DEVELOPER", "HOMEOWNER", "SYSADMIN"),
    controller.getListingsByRole);


router.put("/properties/:propertyId/:userId",
    authenticateUser,
    authorizeRoles("ADMIN", "REALTOR", "DEVELOPER", "HOMEOWNER", "SYSADMIN"),
    controller.updateListingStatus);

module.exports = router;