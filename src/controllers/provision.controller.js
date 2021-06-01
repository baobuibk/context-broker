const EntityDAO = require("../daos/entity.DAO");

const PROVISION_TIMEOUT = process.env.PROVISION_TIMEOUT;
let provObj = {};

class ProvisionController {
  // begin
  static async begin(req, res) {
    const { entity, timeout } = req.query;
    if (!entity) return res.sendStatus(400);
    if (!provObj[entity])
      provObj[entity] = {
        status: "pending",
        timeoutHandler: setTimeout(
          () => delete provObj[entity],
          (timeout || PROVISION_TIMEOUT) * 1000
        ),
      };
    return res.json({ data: { status: "began" } });
  }

  // end
  static async end(req, res) {
    const { entity } = req.query;
    if (!entity) return res.sendStatus(400);
    if (provObj[entity]) {
      clearTimeout(provObj[entity]);
      delete provObj[entity];
    }

    return res.json({ data: { status: "ended" } });
  }

  // status
  static async status(req, res) {
    const { entity } = req.query;
    if (!entity) return res.sendStatus(400);
    if (provObj[entity])
      return res.json({ data: { status: provObj[entity].status } });
    else return res.json({ data: { status: "unavailable" } });
  }

  // request
  static async request(req, res) {
    const { data, entity } = req.body;
    if (!entity || !provObj[entity])
      return res.status(400).send("provision unavailable");
    let result = await Promise.all(
      data.map(async (device) => {
        const { device_id, device_name, device_kind, device_channels } = device;
        let channelData = {};
        let channelAlias = {};
        let channelRecord = {};
        for (const channel of device_channels) {
          channelData[channel.channel_id] = null;
          channelAlias[channel.channel_name] = channel.channel_id;
          channelRecord[channel.channel_id] = true;
        }
        const data = {
          kind: "Device",
          name: device_name,
          device_id,
          device_kind,
          device_channels,
          ...channelData,
          lastTelemetry: null,
        };
        const alias = {
          device_name: "name",
          ...channelAlias,
        };
        const record = {
          ...channelRecord,
        };
        try {
          let result = await EntityDAO.upsertOne({
            parent: entity,
            data,
            alias,
            record,
            queries: { device_id },
          });
          result.device_id = device_id;
          return result;
        } catch (error) {
          console.log(error);
          return false;
        }
      })
    );
    return res.json({ data: result });
  }

  // result
  static async retrieve(req, res) {
    const { entity } = req.query;
    if (!entity) return res.sendStatus(400);
    try {
      const result = await EntityDAO.getMany({
        parent: entity,
        queries: { kind: "Device" },
      });
      return res.json({ data: result });
    } catch (error) {
      console.log(error);
      return res.sendStatus(500);
    }
  }
}

module.exports = ProvisionController;
