const express = require("express");
const router = express.Router();

const TelemetryController = require("./telemetry.controller");

router.post("/gateway", TelemetryController.gatewayRequest);

module.exports = router;
