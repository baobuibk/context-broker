// command controller

const CommandDAO = require("./command.DAO");
const debug = require("debug")("command.controller");
// const mqttClient = require("../mqtt");

class CommandController {
  static async create(req, res) {
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
  }

  static async readAll(req, res) {
    try {
      let foundCommands = await CommandDAO.readAll();
      return res.json(commands);
    } catch (error) {
      debug(error);
      return res.sendStatus(500);
    }
  }

  static async read(req, res) {
    let commandId = req.params.commandId;
    try {
      let foundCommand = await CommandDAO.read(commandId);
      return res.json(foundCommand);
    } catch (error) {
      debug(error);
      return res.sendStatus(500);
    }
  }

  static async replace(req, res) {
    let commandId = req.params.commandId;
    let newCommand = req.body;

    try {
      await CommandDAO.replace(commandId, newCommand);
      return res.status(200);
    } catch (error) {
      debug(error);
      return res.sendStatus(500);
    }
  }

  static async update(req, res) {
    let commandId = req.params.commandId;
    let commandData = req.body;

    try {
      await CommandDAO.update(commandId, commandData);
      return res.sendStatus(200);
    } catch (error) {
      debug(error);
      return res.sendStatus(500);
    }
  }

  static async delete(req, res) {
    let commandId = req.params.commandId;
    try {
      await CommandDAO.delete(commandId);
      return res.sendStatus(200);
    } catch (error) {
      debug(error);
      return res.sendStatus(500);
    }
  }
}

module.exports = CommandController;
