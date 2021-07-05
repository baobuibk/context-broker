const EntityDAO = require("./entity.DAO");

const PROVISION_TIMEOUT = process.env.PROVISION_TIMEOUT || 120000;
let sessions = {};

// begin
exports.begin = async (req, res) => {
  const { entity, timeout = PROVISION_TIMEOUT } = req.query;
  if (!entity) return res.status(400).send("need entity");

  if (!sessions[entity])
    sessions[entity] = {
      status: "pending",
      timeoutHandler: setTimeout(() => delete sessions[entity], timeout * 1000),
    };

  return res.send({ data: { status: sessions[entity].status } });
};

// end
exports.end = async (req, res) => {
  const { entity } = req.query;
  if (!entity) return res.status(400).send("need entity");

  if (sessions[entity]) {
    clearTimeout(sessions[entity]);
    delete sessions[entity];
  }

  return res.json({ data: { status: "ended" } });
};

// status
exports.status = async (req, res) => {
  const { entity } = req.query;
  if (!entity) return res.status(400).send("need entity");

  if (sessions[entity])
    return res.send({ data: { status: sessions[entity].status } });

  return res.send({ data: { status: "ended" } });
};

// request
exports.request = async (req, res) => {
  const { data, entity } = req.body;

  if (!entity) return res.status(400).send("need entity");

  if (!sessions[entity]) return res.status(401).send("unavailable");

  let result = {};
  await Promise.all(
    data.map(async (device) => {
      const { device_id, device_name, device_kind, device_channels } = device;
      if (!(device_id && device_name && device_kind && device_channels))
        return false;

      result[device_id] = {}; // !!!

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

      // For every device
      try {
        let { ok } = await EntityDAO.upsertOne({
          parent: entity,
          data,
          alias,
          record,
          queries: { device_id },
        });

        for (const channel of device_channels) {
          result[device_id][channel.channel_id] = ok;
        }
      } catch (error) {
        console.log(error);
        for (const channel of device_channels) {
          result[device_id][channel.channel_id] = 0;
        }
      }
    })
  );
  return res.json({ data: result });
};

// retrieve result
exports.retrieve = async (req, res) => {
  const { entity } = req.query;
  if (!entity) return res.status(400).send("need entity");

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
};
