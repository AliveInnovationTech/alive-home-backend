"use strict";
const express = require("express");
const router = express.Router();

//get controller
const controller = require("../app/controllers/PartnerController");

const { gatekeeper } = require("mizala-gatekeeper");

router.post("/",gatekeeper(), controller.create);
router.get("/", gatekeeper(), controller.fetchAll);
router.get("/:id",gatekeeper(), controller.findOne);
router.put("/:id",gatekeeper(), controller.update);
//
// router.put("/:id",gatekeeper(), userController.updateUser);

// router.delete("/:id",gatekeeper(), userController.deleteUser);


// router.patch("/:id/revoke",gatekeeper(), userController.revoke);
//
// router.patch("/:id/grant",gatekeeper(), userController.revoke);

// router.get("/:type/:value",gatekeeper(), userController.find);
//

module.exports = router;
