const express = require("express");
const router = express.Router();

const ProvisionController = require("../controllers/provision.controller");

router.get("/begin", ProvisionController.begin);
router.get("/end", ProvisionController.end);
router.get("/status", ProvisionController.status);
router.get("/retrieve", ProvisionController.retrieve);
router.post("/", ProvisionController.request);

module.exports = router;
