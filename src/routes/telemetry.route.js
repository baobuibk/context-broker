const express = require("express");
const router = express.Router();

const TelemetryController = require("../api/telemetry.controller");

router.post("/", TelemetryController.request);

module.exports = router;
