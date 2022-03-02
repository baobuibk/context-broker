const express = require("express");
const router = express.Router();

const commandController = require("./command.controller");

router.post("/", commandController.request);

module.exports = router;
