"use strict";
const express = require("express");
const router = express.Router();
const controller = require("../app/controllers/PropertyController")
const { authenticateUser, authorizeRoles } = require("../lib/authMiddleware")
const upload = require("../app/utils/upload")



router.post("/create",
    authenticateUser,
    authorizeRoles("ADMIN", "OWNER", "SYSADMIN")
    , upload.array("mediaType"), controller.createProperty);

router.get("/:propertyId", controller.getProperty);

router.get("/", controller.getAllProperties);

router.get("/owner/:ownerId",
    authenticateUser,
    authorizeRoles("ADMIN", "ADMIN", "SYSADMIN"), controller.getPropertiesByOwner);

router.put("/:propertyId",
    authenticateUser,
    authorizeRoles("ADMIN", "OWNER", "SYSADMIN")
    , upload.array("mediaType"), controller.updateProperty);

router.delete("/:propertyId",
    authenticateUser,
    authorizeRoles("ADMIN", "OWNER", "SYSADMIN"), controller.deleteProperty);

router.get("/search", controller.searchProperties);

router.get("/properties/analytics",
    authenticateUser,
    authorizeRoles("ADMIN", "OWNER", "SYSADMIN"), controller.getPropertyStats);

module.exports = router;