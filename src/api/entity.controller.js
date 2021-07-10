const EntityDAO = require("./entity.DAO");

class EntityController {
  // add
  static async add(req, res) {
    const { parent, data, alias, link, record } = req.body;

    try {
      const result = await EntityDAO.add({ parent, data, alias, link, record });
      return res.json({ data: result });
    } catch (error) {
      console.log(error);
      return res.sendStatus(500);
    }
  }

  // get
  static async get(req, res) {
    const { id, ids, parent, ancestor, attrs, ...queries } = req.query;
    for (const key in queries) {
      if (queries[key] === "true") queries[key] = true;
      else if (queries[key] === "false") queries[key] = false;
      else if (queries[key] === "null") queries[key] = null;
    }
    try {
      const data = id
        ? await EntityDAO.getById(id, attrs)
        : await EntityDAO.getMany({ ids, parent, ancestor, attrs, queries });
      return res.json({ data });
    } catch (error) {
      console.log(error);
      return res.sendStatus(500);
    }
  }

  // update
  static async update(req, res) {
    const { id, data, alias, link, record } = req.body;
    try {
      if (id) {
        const result = await EntityDAO.updateOne({
          id,
          data,
          alias,
          link,
          record,
        });
        return res.json({ data: { ok: result.ok } });
      } else return res.sendStatus(400);
    } catch (error) {
      console.log(error);
      return res.sendStatus(500);
    }
  }

  // delete
  static async delete(req, res) {
    const { id, ids, parent, ancestor, ...queries } = req.query;
    for (const key in queries) {
      if (queries[key] === "true") queries[key] = true;
      else if (queries[key] === "false") queries[key] = false;
      else if (queries[key] === "null") queries[key] = null;
    }
    try {
      const result = id
        ? await EntityDAO.deleteById(id)
        : await EntityDAO.deleteMany({ ids, parent, ancestor, queries });
      return res.json({ data: result });
    } catch (error) {
      console.log(error);
      return res.sendStatus(500);
    }
  }

  static async getRecords(req, res) {
    const { id, attrs, from, to, interval, filter } = req.query;
    if (!id || !attrs || !year || !month) res.sendStatus(400);
    try {
      const result = await EntityDAO.getRecordsById({
        id,
        attrs,
        from,
        to,
        interval,
        filter,
      });
      return res.json({ data: result });
    } catch (error) {
      console.log(error);
      return res.sendStatus(500);
    }
  }
}

module.exports = EntityController;
