const express = require("express");
const router = express.Router();

const TelemetryController = require("./telemetry.controller");

router.post("/request", TelemetryController.request);

module.exports = router;
