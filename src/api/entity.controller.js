const EntityDAO = require("./entity.DAO");

class EntityController {
  // add
  static async add(req, res) {
    try {
      const { parentId, attrs } = req.body;
      const result = await EntityDAO.add({ attrs, parentId });
      return res.json(result);
    } catch (error) {
      console.log(error);
      return res.sendStatus(500);
    }
  }

  // get
  static async get(req, res) {
    try {
      const { id, ids, parentId, ancestorId, attrs, ...queries } = req.query;

      for (const key in queries) {
        if (queries[key] === "true") queries[key] = true;
        else if (queries[key] === "false") queries[key] = false;
        else if (queries[key] === "null") queries[key] = null;
      }

      let result = id
        ? await EntityDAO.getById(id, attrs)
        : await EntityDAO.getMany({
            ids,
            parentId,
            ancestorId,
            attrs,
            queries,
          });

      return res.json(result);
    } catch (error) {
      console.log(error);
      return res.sendStatus(500);
    }
  }

  // update
  static async update(req, res) {
    try {
      const { id, attrs } = req.body;
      if (!id || !attrs) return res.sendStatus(400);
      await EntityDAO.updateById(id, attrs);
      return res.sendStatus(200);
    } catch (error) {
      console.log(error);
      return res.sendStatus(500);
    }
  }

  // delete
  static async delete(req, res) {
    try {
      const { id, ids, parentId, ancestorId, ...queries } = req.query;

      if (!(id || ids || parentId || ancestorId)) return res.sendStatus(400);

      for (const key in queries) {
        if (queries[key] === "true") queries[key] = true;
        else if (queries[key] === "false") queries[key] = false;
        else if (queries[key] === "null") queries[key] = null;
      }

      if (id) await EntityDAO.deleteById(id);
      else await EntityDAO.deleteMany({ ids, parentId, ancestorId, queries });
      return res.sendStatus(200);
    } catch (error) {
      console.log(error);
      return res.sendStatus(500);
    }
  }
}

module.exports = EntityController;
