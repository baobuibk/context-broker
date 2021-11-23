const EntityDAO = require("./entity.DAO");
const redisClient = require("../redis");

const PROVISION_TIMEOUT = Number(process.env.PROVISION_TIMEOUT) || 120;
let sessions = {};

class ProvisionController {
  static async begin(req, res) {
    const { gatewayId } = req.query;
    if (!gatewayId) return res.status(400).send("no gatewayId");

    redisClient.set(
      gatewayId,
      "available",
      "EX",
      PROVISION_TIMEOUT,
      (err, reply) => {
        if (err) return res.sendStatus(500);

        res.sendStatus(200);
      }
    );
  }

  static async end(req, res) {
    const { gatewayId } = req.query;
    if (!gatewayId) return res.status(400).send("no gatewayId");

    redisClient.exists(gatewayId, (err, reply) => {
      if (err) return res.sendStatus(500);
      if (!reply) return res.sendStatus(400);

      redisClient.del(gatewayId, (err, reply) => {
        if (err) return res.sendStatus(500);

        return res.sendStatus(200);
      });
    });
  }

  static async status(req, res) {
    const { gatewayId } = req.query;
    if (!gatewayId) return res.status(400).send("no gatewayId");

    redisClient.get(gatewayId, (err, reply) => {
      if (err) return res.sendStatus(500);

      if (!reply) return res.send("not available");

      // at this point, provision is available
      // send back time left
      console.log("here");
      redisClient.ttl(gatewayId, (err, ttl) => {
        if (err) return res.sendStatus(500);

        console.log("there");
        return res.json({ timeout: ttl, status: reply });
      });
    });
  }

  static async request(req, res) {
    const { devices, gatewayId } = req.body;
    if (!gatewayId) return res.status(400).send("no gatewayId");

    redisClient.get(gatewayId, async (err, reply) => {
      if (err) return res.sendStatus(500);

      if (!reply) return res.sendStatus(400);

      // at this point, provision is available

      let entities;
      try {
        entities = devices.map((device) => {
          const { device_id, device_name, device_type, channels } = device;
          if (!(device_id && device_name && device_type && channels))
            throw new Error("device info error");

          let entity = {
            parentId: gatewayId,
            attrs: {
              device_id,
              device_name,
              device_type,
            },
          };

          for (const [channel_name, channel_info] of Object.entries(channels)) {
            entity.attrs[channel_name] = channel_info;
          }

          return entity;
        });
      } catch (error) {
        return res.status(400).send(error.message);
      }

      await Promise.all(
        entities.map(async (entity) => await EntityDAO.add(entity))
      );

      redisClient.del(gatewayId, (err, reply) => {
        if (err) console.log("error happen after provision succeed");

        res.sendStatus(200);
      });
    });
  }

  static async retrieve(req, res) {
    const { gatewayId } = req.query;
    if (!gatewayId) return res.status(400).send("no gatewayId");

    try {
      const result = await EntityDAO.getMany({
        parentId: gatewayId,
      });

      return res.json(result);
    } catch (error) {
      console.log(error);
      return res.sendStatus(500);
    }
  }
}

module.exports = ProvisionController;
