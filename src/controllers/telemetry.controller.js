const EntityDAO = require("../daos/entity.DAO");

class TelemetryController {
  // request
  static async request(req, res) {
    const { entity, timestamp, data } = req.body;
    if (!entity) res.sendStatus(400);
    const result = {};
    await Promise.all(
      Object.entries(data).map(async ([device_id, channelData]) => {
        try {
          return (result[device_id] = await EntityDAO.updateOne({
            parent: entity,
            data: { lastTelemetry: timestamp, ...channelData },
            queries: { device_id },
          }));
        } catch (error) {
          console.log(error);
          return (result[device_id] = { ok: 0 });
        }
      })
    );
    return res.json({ data: result });
  }
}

module.exports = TelemetryController;
