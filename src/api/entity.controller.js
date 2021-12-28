const EntityDAO = require("./entity.DAO");
const debug = require("debug")("EntityController");

class EntityController {
  static async add(req, res) {
    const entityData = req.body;

    try {
      let result;
      if (Array.isArray(entityData))
        result = await EntityDAO.addMany(entityData);
      else if (typeof entityData === "object" && entityData !== null)
        result = await EntityDAO.addOne(entityData);
      else return res.sendStatus(400);

      return res.json(result);
    } catch (error) {
      debug(error.message);
      return res.sendStatus(500);
    }
  }

  static async get(req, res) {
    const { id, ids, type, q, attrs, options } = req.query;

    try {
      if (id) {
        let result = await EntityDAO.getById({ id, attrs, options });
        return res.json(result);
      } else {
        let result = await EntityDAO.getMany({
          ids,
          type,
          query: q,
          attrs,
          options,
        });
        return res.json(result);
      }
    } catch (error) {
      debug(error.message);
      return res.sendStatus(500);
    }
  }

  static async telemetry(req, res) {
    const { id, timestamp } = req.query;
    const entityData = req.body;

    try {
      await EntityDAO.telemetryOne({ id, data: entityData, timestamp });
      return res.sendStatus(200);
    } catch (error) {
      debug(error.message);
      return res.sendStatus(500);
    }
  }

  static async telemetryGateway(req, res) {
    let { gatewayId, devices, timestamp } = req.body;

    try {
      let result = await Promise.all(
        Object.entries(devices).map(async (device) => {
          const [device_id, channelData] = device;
          return await EntityDAO.telemetryOne({
            type: "Device",
            query: { gatewayId, device_id },
            data: channelData,
            timestamp: timestamp || new Date(),
          });
        })
      );
      return res.json(result);
    } catch (error) {
      debug(error.message);
      return res.sendStatus(500);
    }
  }

  static async update(req, res) {
    const { id } = req.query;

    if (!id) res.status(400).send("require id");
    const data = req.body;

    try {
      await EntityDAO.updateById({ id, data });
      return res.sendStatus(200);
    } catch (error) {
      debug(error.message);
      return res.sendStatus(500);
    }
  }

  // delete an entity
  static async delete(req, res) {
    const { id, ids, type, q } = req.query;

    try {
      let result;
      if (id) result = await EntityDAO.deleteById({ id });
      else result = await EntityDAO.deleteMany({ ids, type, query });
      debug(result);
      return res.sendStatus(200);
    } catch (error) {
      debug(error.message);
      return res.sendStatus(500);
    }
  }

  static async getTimeseries(req, res) {
    const { id, ids, type, q, attrs, ...options } = req.query;

    try {
      let result;
      if (id) result = await EntityDAO.getRecordById({ id, attrs, options });
      else
        result = await EntityDAO.getRecordMany({
          ids,
          type,
          query: q,
          attrs,
          options,
        });
      debug(result);
      return res.json({ data: result });
    } catch (error) {
      debug(error.message);
      return res.sendStatus(500);
    }
  }
}

module.exports = EntityController;
