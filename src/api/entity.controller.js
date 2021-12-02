const EntityDAO = require("./entity.DAO");
const debug = require("debug")("EntityController");

class EntityController {
  // addEntity
  static async addEntity(req, res) {
    // req.query, req.body
    const data = req.body;

    try {
      let result;

      if (Array.isArray(data)) result = await EntityDAO.addMany(data);
      else if (typeof data === "object") result = await EntityDAO.addOne(data);
      else return res.sendStatus(400);

      debug(result);

      return res.json(result);
    } catch (error) {
      debug(error);
      return res.sendStatus(400);
    }
  }

  // list entities
  static async getManyEntities(req, res) {
    // req.query
    const { ids, type, attrs, options, q } = req.query;

    try {
      let result;

      result = await EntityDAO.getMany({ ids, type, attrs, options, q });

      debug(result);

      return res.json(result);
    } catch (error) {
      debug(error);
      return res.sendStatus(500);
    }
  }

  // retrieve the details of a single entity
  static async getOneEntity(req, res) {
    // req.query, req.params
    const { entityId } = req.params;
    const { type, attrs, options, q } = req.query;

    try {
      let result;

      result = await EntityDAO.getOne({
        id: entityId,
        type,
        attrs,
        options,
        q,
      });

      debug(result);

      return res.json(result);
    } catch (error) {
      console.log(error);
      return res.sendStatus(500);
    }
  }

  static async updateEntityBatch(req, res) {
    // req.query, req.body

    const data = req.body;

    try {
      let result = await EntityDAO.updateBatch(data, { timestamp });
      debug(result);
      return res.json(result);
    } catch (error) {
      debug(error);
      return res.sendStatus(500);
    }
  }

  static async updateManyEntities(req, res) {
    // req.query, req.body

    const { type, q, timestamp } = req.query;
    const data = req.body;

    try {
      let result = await EntityDAO.updateMany({
        type,
        q,
        attributes: data,
        timestamp,
      });
      debug(result);
      return res.json(result);
    } catch (error) {
      debug(error);
      return res.sendStatus(500);
    }
  }

  // update an attribute
  static async updateOneEntity(req, res) {
    // req.query, req.body, req.params
    const { timestamp } = req.query;
    const { entityId } = req.params;
    const data = req.body;

    try {
      let result = await EntityDAO.updateOne({
        id: entityId,
        attributes: data,
        timestamp,
      });
      debug(result);
      return res.json(result);
    } catch (error) {
      debug(error);
      return res.sendStatus(500);
    }
  }

  static async deleteManyEntities(req, res) {
    // req.query
    res.sendStatus(500);
  }

  // delete an entity
  static async deleteOneEntity(req, res) {
    // req.query, req.params
    const { entityId } = req.params;

    try {
      const { ok } = await EntityDAO.deleteEntity(entityId);

      if (ok) return res.sendStatus(204);
      else return res.sendStatus(404);
    } catch (error) {
      console.log(error);
      return res.sendStatus(500);
    }
  }

  static async getOneEntityRecord(req, res) {
    // req.query, req.params
    try {
      const { id, q, attrs, options } = req.query;
      if (!id) return res.sendStatus(400);

      const _q = JSON.parse(q);

      let result = id
        ? await EntityDAO.getRecordById({ id, attrs, options })
        : await EntityDAO.getRecord({ q: _q, attrs, options });
      return res.json(result);
    } catch (error) {
      console.log(error);
      return res.status(400).send(error.message);
    }
  }
}

module.exports = EntityController;
