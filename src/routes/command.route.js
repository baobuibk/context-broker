const express = require("express");
const router = express.Router();

const CommandDAO = require("../DAOs/command.DAO");
// const debug = require("debug")("command.route");
const debug = console.log;

router.post("/", async (req, res) => {
  const { rootId, deviceId, channels } = req.body;

  try {
    /** id, entityId, data [, status] */
    let newCommand = await CommandDAO.create({ rootId, deviceId, channels });

    let msg = JSON.stringify({
      action: "command",
      deviceId,
      channels,
    });
    console.log(msg);
    // mqttClient.publish(`down/${rootId}`, msg);

    return res.json(newCommand);
  } catch (error) {
    debug(error);
    return res.sendStatus(500);
  }
});
router.get("/", async (req, res) => {
  try {
    let foundCommands = await CommandDAO.readAll();
    return res.json(commands);
  } catch (error) {
    debug(error);
    return res.sendStatus(500);
  }
});
router.get("/:commandId", async (req, res) => {
  let commandId = req.params.commandId;
  try {
    let foundCommand = await CommandDAO.read(commandId);
    return res.json(foundCommand);
  } catch (error) {
    debug(error);
    return res.sendStatus(500);
  }
});

router.patch("/:commandId", async (req, res) => {
  let commandId = req.params.commandId;
  let commandData = req.body;

  try {
    await CommandDAO.update(commandId, commandData);
    return res.sendStatus(200);
  } catch (error) {
    debug(error);
    return res.sendStatus(500);
  }
});
router.delete("/:commandId", async (req, res) => {
  let commandId = req.params.commandId;
  try {
    await CommandDAO.delete(commandId);
    return res.sendStatus(200);
  } catch (error) {
    debug(error);
    return res.sendStatus(500);
  }
});

module.exports = router;
