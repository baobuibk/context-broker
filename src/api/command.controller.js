const MQTT = require("../mqtt");

class CommandController {
  static async request(req, res) {
    const { data, apikey } = req.body;
    MQTT.publish(`down/command/${apikey}`, JSON.stringify(data));

    res.sendStatus(200);
  }
}

module.exports = CommandController;
