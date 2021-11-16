const EntityDAO = require("./entity.DAO");

class EntityController {
  // add
  static async add(req, res) {
    try {
      const { parent, attrs } = req.body;
      const result = await EntityDAO.add({ attrs, parent });
      return res.json(result);
    } catch (error) {
      console.log(error);
      return res.sendStatus(500);
    }
  }

  // get
  static async get(req, res) {
    try {
      const { id, ids, parent, ancestor, attrs, ...queries } = req.query;
      for (const key in queries) {
        if (queries[key] === "true") queries[key] = true;
        else if (queries[key] === "false") queries[key] = false;
        else if (queries[key] === "null") queries[key] = null;
      }

      let result;
      if (id) result = await EntityDAO.getById(id, attrs);
      else if (ids) result = await EntityDAO.getByIds(ids, attrs);
      else if (parent)
        result = await EntityDAO.getByParent({ parent, attrs, queries });
      else if (ancestor)
        result = await EntityDAO.getByAncestor({ ancestor, attrs, queries });
      else return res.sendStatus(400);

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
      const result = await EntityDAO.updateById(id, attrs);
      return res.json(result);
    } catch (error) {
      console.log(error);
      return res.sendStatus(500);
    }
  }

  // delete
  static async delete(req, res) {
    try {
      const { id, ids, parent, ancestor, ...queries } = req.query;
      for (const key in queries) {
        if (queries[key] === "true") queries[key] = true;
        else if (queries[key] === "false") queries[key] = false;
        else if (queries[key] === "null") queries[key] = null;
      }

      if (id) await EntityDAO.deleteById(id);
      else if (ids) await EntityDAO.deleteByIds(ids);
      else if (parent) await EntityDAO.deleteByParent(parent, queries);
      else if (ancestor) await EntityDAO.deleteByAncestor(ancestor, queries);
      else return res.sendStatus(400);
      return res.sendStatus(200);
    } catch (error) {
      console.log(error);
      return res.sendStatus(500);
    }
  }
}

module.exports = EntityController;
