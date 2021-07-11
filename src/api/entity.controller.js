const EntityDAO = require("./entity.DAO");
const { ObjectId } = require("mongodb");

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
    const { id, attrs, date, from, to, interval, filter } = req.query;

    if (!id) return res.status(400).send("id is undefined");
    else if (!ObjectId.isValid(id)) return res.status(400).send("bad id");

    if (!attrs) return res.status(400).send("attrs is undefined");
    else {
      var attrsArr = attrs.split(",");
      if (attrsArr.some((e) => !e.length))
        return res.status(400).send("bad attrs");
    }

    if (interval) {
      const intervalEnums = [
        "year",
        "month",
        "day",
        "hour",
        "30m",
        "15m",
        "minute",
        "30s",
        "15s",
        "second",
      ];
      if (!intervalEnums.includes(interval))
        return res.status(400).send("bad interval");
    }

    if (filter) {
      var filterArr = filter.split(",");
      const filterEnums = [
        "all",
        "avg",
        "count",
        "first",
        "last",
        "max",
        "min",
      ];
      if (filterArr.some((e) => !filterEnums.includes(e)))
        return res.status(400).send("bad filter");
    }

    // if (date)
    //   if (isNaN(new Date(date))) return res.status(400).send("bad date");

    // if (from)
    //   if (isNaN(new Date(from))) return res.status(400).send("bad from");

    // if (to) if (isNaN(new Date(to))) return res.status(400).send("bad to");

    // if (from && to)
    //   if (!(new Date(from) <= new Date(to)))
    //     return res.status(400).send("from is bigger than to");

    try {
      const result = await EntityDAO.getRecordsById({
        id,
        attrs: attrsArr,
        date,
        from,
        to,
        interval,
        filter: filterArr,
      });
      return res.json({ data: result });
    } catch (error) {
      console.log(error);
      return res.sendStatus(500);
    }
  }
}

module.exports = EntityController;
