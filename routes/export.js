"use strict";
const router = require("express")
    .Router();

const {internal} = require("../app/Middleware");
const controller = require("../app/controllers/ExportController");

router.get("/users", internal, controller.users);

module.exports = router;
