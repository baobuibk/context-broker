const express = require("express");
const router = express.Router();

const EntityController = require("./entity.controller");

router.get("/:entityId", EntityController.getById);

router.post("/", EntityController.add);
router.get("/", EntityController.get);
router.patch("/", EntityController.update);
router.delete("/", EntityController.delete);

// OR

router.post("/add", EntityController.add);
router.get("/get", EntityController.get);
router.post("/update", EntityController.update);
router.get("/delete", EntityController.delete);

// other
// router.post("/telemetry", EntityController.telemetry);
router.post("/telemetry/gateway", EntityController.telemetryGateway);

router.get("/timeseries", EntityController.getTimeseries);
router.get("/timeseries/get", EntityController.getTimeseries);
router.get("/get/timeseries", EntityController.getTimeseries);

module.exports = router;
