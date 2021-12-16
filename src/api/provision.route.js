const express = require("express");
const router = express.Router();

const Provision = require("./provision.controller");

router.get("/begin", Provision.begin);
router.get("/begin/:gatewayId", Provision.begin);

router.get("/end", Provision.end);
router.get("/end/:gatewayId", Provision.end);

router.get("/status", Provision.status);
router.get("/status/gatewayId", Provision.status);

router.get("/retrieve", Provision.retrieve);
router.get("/retrieve/:gatewayId", Provision.retrieve);

router.post("/request", Provision.request);

module.exports = router;
