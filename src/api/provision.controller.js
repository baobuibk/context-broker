const EntityDAO = require("./entity.DAO");
const debug = require("debug")("ProvisionController");
const redisClient = require("../redis");

const PROVISION_TIMEOUT = Number(process.env.PROVISION_TIMEOUT) || 120;

class ProvisionController {
  static async begin(req, res) {
    const { gatewayId: paramGatewayId } = req.params;
    const { gatewayId: queryGatewayId } = req.query;
    let gatewayId = paramGatewayId || queryGatewayId;
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
    const { gatewayId: paramGatewayId } = req.params;
    const { gatewayId: queryGatewayId } = req.query;
    let gatewayId = paramGatewayId || queryGatewayId;
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
    const { gatewayId: paramGatewayId } = req.params;
    const { gatewayId: queryGatewayId } = req.query;
    let gatewayId = paramGatewayId || queryGatewayId;
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
    const { gatewayId, devices } = req.body;
    if (!gatewayId) return res.status(400).send("no gatewayId");

    redisClient.get(gatewayId, async (err, reply) => {
      if (err) return res.sendStatus(500);
      if (!reply) return res.sendStatus(400);
      // at this point, provision is available
      let result = await Promise.all(
        devices.map(async (device) => {
          const { device_id, channels, ...deviceInfo } = device;
          if (!(device_id && channels)) throw new Error("device info error");
          let entityData = {
            device_id: { type: "Property", value: device_id },
            gatewayId: { type: "Property", value: gatewayId },
          };
          for (const key in deviceInfo) {
            entityData[key] = { type: "Property", value: deviceInfo[key] };
          }
          for (const key in channels) {
            entityData[key] = { type: "Property", ...channels[key] };
          }

          return await EntityDAO.upsertOne({
            type: "Device",
            query: { gatewayId, device_id },
            data: entityData,
          });
        })
      );

      redisClient.del(gatewayId);
      return res.json(result);
    });
  }

  static async retrieve(req, res) {
    const { gatewayId: paramGatewayId } = req.params;
    const { gatewayId: queryGatewayId } = req.query;
    let gatewayId = paramGatewayId || queryGatewayId;
    if (!gatewayId) return res.status(400).send("no gatewayId");

    try {
      const result = await EntityDAO.getMany({
        type: "Device",
        query: { gatewayId },
      });

      return res.json(result);
    } catch (error) {
      console.log(error);
      return res.sendStatus(500);
    }
  }
}

module.exports = ProvisionController;
