const debug = require("debug")("contextEmitter");

const { createClient } = require("redis");
const client = createClient();
client.on("connect", () => debug("connect"));
client.on("ready", () => debug("ready"));
client.on("end", () => debug("end"));
client.on("error", (error) => debug("error", error.message));
client.on("reconnecting", () => debug("reconnecting"));
client.connect();

class ContextEmitter {
  client;
  constructor(client) {
    this.client = client;
  }

  publish(topic, message) {
    debug(topic, message);
    this.client.publish(topic, message);
  }
}

module.exports = new ContextEmitter(client);
