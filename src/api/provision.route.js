const express = require("express");
const router = express.Router();

const Provision = require("./provision.controller");

router.get("/begin/:apikey", Provision.begin);
router.get("/end/:apikey", Provision.end);
router.get("/status/apikey", Provision.status);
router.get("/retrieve/:apikey", Provision.retrieve);
router.post("/request/:apikey", Provision.request);

module.exports = router;
