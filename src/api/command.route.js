const express = require("express");
const router = express.Router();

const CommandController = require("./command.controller");

router.post("/", CommandController.create);
router.get("/", CommandController.readAll);
router.get("/:commandId", CommandController.read);
router.put("/:commandId", CommandController.replace);
router.patch("/:commandId", CommandController.update);
router.delete("/:commandId", CommandController.delete);

module.exports = router;
