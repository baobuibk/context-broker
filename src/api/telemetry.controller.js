const EntityDAO = require("./entity.DAO");

class TelemetryController {
  static async gatewayRequest(req, res) {
    const { gatewayId, devices } = req.body;
    if (!gatewayId) return res.status(400).send("no gatewayId");

    let entityUpdates;
    try {
      entityUpdates = devices.map((device) => {
        const { device_id, channels } = device;
        if (!(device_id && channels)) throw new Error("device info error");

        let entityUpdate = {
          parentId: gatewayId,
          queries: {
            device_id,
          },
          attrs: {},
        };

        for (const [channel_name, channel_info] of Object.entries(channels)) {
          if (
            typeof channel_info === "object" &&
            !Array.isArray(channel_info) &&
            channel_info !== null
          ) {
            if (!channel_info.value) throw new Error("channel info error");
            entityUpdate.attrs[channel_name] = channel_info.value;
          } else if (
            typeof channel_info === "number" ||
            typeof channel_info === "boolean" ||
            typeof channel_info === "string"
          ) {
            entityUpdate.attrs[channel_name] = channel_info;
          } else throw new Error("wrong attr format");
        }

        return entityUpdate;
      });
    } catch (error) {
      console.log("go here");
      return res.status(400).send(error.message);
    }

    await Promise.all(
      entityUpdates.map(
        async (entityUpdate) => await EntityDAO.updateOne(entityUpdate)
      )
    );

    return res.sendStatus(200);
  }
}

module.exports = TelemetryController;
