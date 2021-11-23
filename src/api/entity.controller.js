const EntityDAO = require("./entity.DAO");

class EntityController {
  // create new entities
  static async createEntity(req, res) {
    const { id, type, ...attributes } = req.body;

    try {
      const { ok, errors } = await EntityDAO.createEntity(id, type, attributes);

      if (ok) return res.sendStatus(201);
      else return res.status(409).json({ errors });
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
      const { ok, errors } = await EntityDAO.addAttribute(entityId, attributes);

      if (ok) return res.sendStatus(201);
      else return res.status(409).json({ errors });
    } catch (error) {
      console.log(error);
      return res.sendStatus(500);
    }
  }

  // batch create new data entities or attributes
  static async batchCreate() {}

  // batch create/overwrite new data entities
  static async batchUpsert(req, res) {
    const entities = req.body;

    try {
      const { ok, n } = await EntityDAO.batchUpsert(entities);

      if (ok) return res.status(201).send({ ok, n });
    } catch (error) {
      console.log(error);
      return res.status(400).send(error.message);
    }
  }

  // list entities
  static async listEntities(req, res) {
    const { id, type, attrs, options, q } = req.query;

    try {
      const result = await EntityDAO.listEntities({
        ...(id && { id }),
        ...(type && { type }),
        ...(attrs && { attrs }),
        ...(options && { options }),
        ...(q && { q }),
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
    const { type, attrs, options, q } = req.query;

    // options=sysAttrs|keyValues

    try {
      const result = await EntityDAO.retrieveEntity(entityId, {
        ...(type && { type }),
        ...(attrs && { attrs }),
        ...(options && { options }),
        ...(q && { q }),
      });

      return res.json(result);
    } catch (error) {
      console.log(error);
      return res.sendStatus(500);
    }
  }

  // update an attribute
  static async updateAttribute(req, res) {
    const { timestamp } = req.query;
    const { entityId, attribute } = req.params;
    const attributeData = req.body;

    try {
      const result = await EntityDAO.updateAttributes(
        entityId,
        {
          [attribute]: attributeData,
        },
        { timestamp }
      );
      return res.json(result);
    } catch (error) {
      console.log(error);
      return res.sendStatus(500);
    }
  }

  // update multiple attributes
  static async updateAttributes(req, res) {
    const { timestamp } = req.query;
    const { entityId } = req.params;
    const attributes = req.body;

    try {
      const result = await EntityDAO.updateAttributes(entityId, attributes, {
        timestamp,
      });

      let now = new Date();
      return res.send({ timeis: now, ...result });
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
