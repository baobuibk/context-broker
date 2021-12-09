const EntityDAO = require("./entity.DAO");
const debug = require("debug")("EntityController");

class EntityController {
  static async add(req, res) {
    const { data } = req.body;

    try {
      let result;
      if (!Array.isArray(data) && typeof data === "object" && data !== null)
        result = await EntityDAO.addOne(data);
      else if (Array.isArray(data)) result = await EntityDAO.addMany(data);
      else return res.sendStatus(400);
      debug(result);
      return res.sendStatus(200);
    } catch (error) {
      debug(error.message);
      return res.sendStatus(500);
    }
  }

  static async get(req, res) {
    const { id, ids, type, q, attrs, options } = req.query;

    try {
      let result;
      if (id) result = await EntityDAO.getById({ id, attrs, options });
      else result = await EntityDAO.getMany({ ids, type, q, attrs, options });
      debug(result);

      return res.json({ data: result });
    } catch (error) {
      debug(error.message);
      return res.sendStatus(500);
    }
  }

  static async updateValue(req, res) {
    const { id, timestamp } = req.query;
    const { data } = req.body;

    try {
      await EntityDAO.updateValue({ id, data, timestamp });
      return res.sendStatus(200);
    } catch (error) {
      debug(error.message);
      return res.sendStatus(500);
    }
  }

  static async updateAttribute(req, res) {
    const { id } = req.query;
    const { data } = req.body;

    try {
      await EntityDAO.updateAttribute({ id, data });
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
      else result = await EntityDAO.deleteMany({ ids, type, q });
      debug(result);
      return res.sendStatus(200);
    } catch (error) {
      debug(error.message);
      return res.sendStatus(500);
    }
  }

  static async getRecord(req, res) {
    const { id, ids, type, q, attrs, options } = req.query;

    try {
      let result;
      if (id) result = await EntityDAO.getRecordById({ id, attrs, options });
      else
        result = await EntityDAO.getRecordMany({
          ids,
          type,
          q,
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
