const express = require("express");
const router = express.Router();

const EntityController = require("./entity.controller");

router.post("/add", EntityController.add);
router.get("/get", EntityController.get);
router.post("/update/value", EntityController.updateValue);
router.post("/update/attribute", EntityController.updateAttribute);
router.get("/delete", EntityController.delete);
router.get("/get/record", EntityController.getRecord);

module.exports = router;
