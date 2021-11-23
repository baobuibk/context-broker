const EntityDAO = require("./entity.DAO");

class EntityController {
  // create new entities
  static async createEntity(req, res) {
    const { id, type, ...attributes } = req.body;

    try {
      const { ok } = await EntityDAO.createEntity(id, type, attributes);

      if (ok) return res.sendStatus(201);
      else return res.sendStatus(409);
    } catch (error) {
      console.log(error);
      return res.sendStatus(500);
    }
  }

  // add new attributes
  static async addAttribute(req, res) {
    const { entityId } = req.params;
    const attributes = req.body;

    try {
      const { ok } = await EntityDAO.addAttribute(entityId, attributes);

      if (ok) return res.sendStatus(201);
      else return res.sendStatus(409);
    } catch (error) {
      console.log(error);
      return res.sendStatus(500);
    }
  }

  // batch create new data entities or attributes
  static async batchCreate() {}

  // batch create/overwrite new data entities
  static async batchUpsert() {}

  // list entities
  static async listEntities(req, res) {
    const { type, options, attrs, id, q } = req.query;

    try {
      const result = await EntityDAO.listEntities({
        type,
        options,
        attrs,
        id,
        q,
      });

      return res.json(result);
    } catch (error) {
      console.log(error);
      return res.sendStatus(500);
    }
  }

  // retrieve the details of a single entity
  static async retrieveEntity(req, res) {
    const { entityId } = req.params;
    const { type, options, attrs, q } = req.query;

    // options=sysAttrs|keyValues

    try {
      const result = await EntityDAO.retrieveEntity(entityId, {
        type,
        options,
        attrs,
        q,
      });

      return res.json(result);
    } catch (error) {
      console.log(error);
      return res.sendStatus(500);
    }
  }

  // update an attribute
  static async updateAttribute(req, res) {
    const { entityId, attribute } = req.params;
    const data = req.body;

    try {
      const result = await EntityDAO.updateAttribute(entityId, attribute, data);
      return res.json(result);
    } catch (error) {
      console.log(error);
      return res.sendStatus(500);
    }
  }

  // update multiple attributes
  static async updateAttributes(req, res) {
    const { entityId } = req.params;
    const attributes = req.body;

    try {
      const result = await EntityDAO.updateAttributes(entityId, attributes);
      return res.json(result);
    } catch (error) {
      console.log(error);
      return res.sendStatus(500);
    }
  }

  // batch update attributes of multiple data entities
  // static async batchUpsert(req, res) {}

  // batch replace entity data
  static async batchUpdate() {}

  // delete an entity
  static async deleteEntity(req, res) {
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

  // delete an attribute
  static async deleteAttribute(req, res) {
    const { entityId, attribute } = req.params;

    try {
      const { ok } = await EntityDAO.deleteAttribute(entityId, attribute);

      if (ok) return res.sendStatus(204);
      else return res.sendStatus(404);
    } catch (error) {
      console.log(error);
      return res.sendStatus(500);
    }
  }

  // batch delete multiple entities
  static async batchDelete(req, res) {}

  // batch delete multiple attributes from an entity
  // static async updateAttributes(req, res) {}

  static async getRecord(req, res) {
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
