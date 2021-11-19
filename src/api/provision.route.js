const express = require("express");
const router = express.Router();

const Provision = require("./provision.controller");

router.get("/begin", Provision.begin);
router.get("/end", Provision.end);
router.get("/status", Provision.status);
router.get("/retrieve", Provision.retrieve);
router.post("/", Provision.request);

module.exports = router;
