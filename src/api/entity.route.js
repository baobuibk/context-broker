const express = require("express");
const router = express.Router();

const EntityController = require("./entity.controller");

router.post("/add", EntityController.add);
router.get("/get", EntityController.get);

router.post("/update/attribute", EntityController.updateAttribute);
router.post("/replace/attribute", EntityController.updateAttribute);
router.get("/delete", EntityController.delete);

router.post("/telemetry", EntityController.telemetry);
router.post("/telemetry/gateway", EntityController.telemetryGateway);
router.get("/timeseries", EntityController.timeseries);

module.exports = router;
