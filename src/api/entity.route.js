const express = require("express");
const router = express.Router();

const EntityController = require("./entity.controller");

router.post("/add", EntityController.add);
router.get("/get", EntityController.get);
router.post("/update", EntityController.update);
router.get("/delete", EntityController.delete);

router.get("/record/get", EntityController.getRecord);

module.exports = router;
