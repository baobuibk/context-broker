const express = require("express");
const router = express.Router();

const EntityController = require("./entity.controller");

router.get("/get", EntityController.get);
router.post("/add", EntityController.add);
router.post("/update", EntityController.update);
router.get("/delete", EntityController.delete);

module.exports = router;
