const express = require("express");
const router = express.Router();

const TelemetryController = require("../controllers/telemetry.controller");

router.post("/", TelemetryController.request);

module.exports = router;
