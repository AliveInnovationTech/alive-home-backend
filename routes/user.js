const router = require("express").Router();
const {gatekeeper} = require("mizala-gatekeeper");

//get controller
const {decodeHeaders} = require("../app/Middleware");
const userController = require("../app/controllers/UserController");
router.get("/check", userController.check);

router.post("/", decodeHeaders, userController.create);


router.get("/", gatekeeper(), userController.fetchAll);

router.get("/:id", gatekeeper(), userController.findOne);

router.put("/:id", gatekeeper(), userController.updateUser);

router.get("/:type/:value", gatekeeper(), userController.findByType);

router.post("/:type/:value", gatekeeper(), userController.findOrCreate);


module.exports = router;
