const express = require("express");
const router = express.Router();

const EntityController = require("./entity.controller");

router.post("/add", EntityController.add);
router.get("/get", EntityController.get);
router.get("/:entityId", EntityController.getById);
router.post("/update", EntityController.update);
router.get("/delete", EntityController.delete);

router.post("/telemetry", EntityController.telemetry);
router.post("/telemetry/gateway", EntityController.telemetryGateway);

router.get("/timeseries", EntityController.getTimeseries);
router.get("/timeseries/get", EntityController.getTimeseries);
router.get("/get/timeseries", EntityController.getTimeseries);

module.exports = router;
