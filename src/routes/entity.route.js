const express = require("express");
const router = express.Router();

const EntityController = require("../controllers/entity.controller");

router.post("/add", EntityController.add);
router.get("/get", EntityController.get);
router.get("/get/records", EntityController.getRecords);
router.post("/update", EntityController.update);
router.get("/delete", EntityController.delete);

module.exports = router;
