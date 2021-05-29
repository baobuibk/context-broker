const ObjectId = require("mongodb").ObjectId;
const RecordDAO = require("./record.DAO");

const Schema = require("../schemas/entity.schema");

let Entity;
const collName = "entities";

class EntityDAO {
  static async addSchema(db) {
    try {
      const collList = await db
        .listCollections({ name: collName }, { nameOnly: true })
        .toArray();

      if (collList.length) {
        await db.command({
          collMod: collName,
          validator: Schema,
        });
        console.log(`modified ${collName} schema`);
      } else {
        await db.createCollection(collName, {
          validator: Schema,
        });
        console.log(`created ${collName} schema`);
      }
    } catch (error) {
      console.log(`unable to consolidate ${collName} schema`, error);
    }
  }

  static inject(db) {
    if (!Entity) Entity = db.collection(collName);
  }

  // add
  static async add({ parent: parentId, data, alias, link, record }) {
    // path, ancestor feature
    if (parentId) {
      const query = { _id: ObjectId(parentId) };
      const options = { projection: { path: 1 } };
      const parent = await Entity.findOne(query, options);
      if (!parent) {
        console.log("parent not found");
        return null;
      }
      const parentPath = parent.path;
      var path = parentPath ? parentPath + "," + parentId : parentId;
    } else {
      var path = "";
    }
    let attrsObj = {};
    for (const attr in data) {
      attrsObj[attr] = {
        type: "data",
        value: data[attr],
      };
    }
    for (const attr in alias) {
      attrsObj[attr] = {
        type: "alias",
        target: alias[attr],
      };
    }
    for (const attr in link) {
      attrsObj[attr] = {
        type: "link",
        target: { entity: ObjectId(link[attr].entity), attr: link[attr].attr },
      };
    }
    for (const attr in record) {
      attrsObj[attr].record = record[attr];
    }
    const newEntity = {
      path,
      ...(parentId && { parent: ObjectId(parentId) }),
      attrs: attrsObj,
    };
    const { connection, message, ...result } = await Entity.insertOne(
      newEntity
    );
    return { id: result.insertedId };
  }

  // upsertOne
  static async upsertOne(props) {
    const { parent, data, alias, link, record, queries } = props;

    // path feature
    if (parent) {
      const query = { _id: ObjectId(parent) };
      const options = { projection: { path: 1 } };
      const parentDoc = await Entity.findOne(query, options);
      if (!parentDoc) {
        console.log("parent not found");
        return null;
      }
      const parentPath = parentDoc.path;
      var path = parentPath ? parentPath + "," + parent : parent;
    } else {
      var path = "";
    }

    let setObj = {
      path,
      ...(parent && { parent: ObjectId(parent) }),
    };
    for (const attr in data) {
      setObj["attrs." + attr + ".type"] = "data";
      setObj["attrs." + attr + ".value"] = data[attr];
    }
    for (const attr in alias) {
      setObj["attrs." + attr] = {
        type: "alias",
        target: alias[attr],
      };
    }
    for (const attr in link) {
      setObj["attrs." + attr] = {
        type: "link",
        target: { entity: ObjectId(link[attr].entity), attr: link[attr].attr },
      };
    }
    for (const attr in record) {
      setObj["attrs." + attr + ".record"] = record[attr];
    }

    let queryObj = {};
    for (const key in queries) {
      queryObj[`attrs.${key}.value`] = queries[key];
    }
    const filter = {
      ...(parent && { parent: ObjectId(parent) }),
      ...queryObj,
    };
    const update = { $set: setObj };
    const options = { upsert: true };
    const { result } = await Entity.updateOne(filter, update, options);
    const m = result.nModified;
    const u = result.upserted;
    const status =
      !m && !u
        ? "unchanged"
        : !m && u
        ? "upserted"
        : m && !u
        ? "updated"
        : "error";
    return { ok: result.ok, status };
  }

  // getById
  static async getById(id, attrs) {
    const query = { _id: ObjectId(id) };
    const options = { projection: { attrs: 1 } };
    const entity = await Entity.findOne(query, options);

    const attrsObj = entity.attrs;
    let result = {};
    if (attrs) {
      const attrsArr = Array.isArray(attrs) ? attrs : attrs.split(",");
      for (const key of attrsArr) {
        result[key] = await solveAttr(attrsObj, key);
      }
    } else
      for (const key in attrsObj) {
        const attr = attrsObj[key];
        result[key] =
          attr.type === "data"
            ? attr.value
            : attr.type === "link"
            ? "link"
            : attr.type === "alias"
            ? "alias"
            : null;
      }
    result.id = entity._id;
    return result;
  }

  // getMany
  static async getMany({ ids, parent, ancestor, attrs, queries }) {
    let queryObj = {};
    for (const key in queries) {
      queryObj[`attrs.${key}.value`] = queries[key];
    }
    const query = {
      ...(ids && { _id: { $in: ObjectIdsArr(ids) } }),
      //  path = new RegExp(parent + "$");
      ...(parent && { parent: ObjectId(parent) }),
      ...(ancestor && { path: new RegExp(ancestor) }),
      ...queryObj,
    };

    const options = { projection: { attrs: 1 } };
    const entitiesArr = await Entity.find(query, options).toArray();
    return Promise.all(
      entitiesArr.map(async (entity) => {
        const attrsObj = entity.attrs;
        let result = {};
        if (attrs) {
          const attrsArr = Array.isArray(attrs) ? attrs : attrs.split(",");
          for (const key of attrsArr) {
            result[key] = await solveAttr(attrsObj, key);
          }
        } else
          for (const key in attrsObj) {
            const attr = attrsObj[key];
            result[key] =
              attr.type === "data"
                ? attr.value
                : attr.type === "link"
                ? "link"
                : attr.type === "alias"
                ? "alias"
                : null;
          }
        result.id = entity._id;
        return result;
      })
    );
  }

  // updateOne
  static async updateOne({
    id,
    parent,
    ancestor,
    data,
    alias,
    link,
    record,
    queries,
  }) {
    let setObj = {};
    let projectionObj = {};
    for (const attr in data) {
      setObj["attrs." + attr + ".type"] = "data";
      setObj["attrs." + attr + ".value"] = data[attr];
      projectionObj["attrs." + attr] = 1;
    }
    for (const attr in alias) {
      setObj["attrs." + attr] = {
        type: "alias",
        target: alias[attr],
      };
      projectionObj["attrs." + attr] = 1;
    }
    for (const attr in link) {
      setObj["attrs." + attr] = {
        type: "link",
        target: { entity: ObjectId(link[attr].entity), attr: link[attr].attr },
      };
      projectionObj["attrs." + attr] = 1;
    }
    for (const attr in record) {
      setObj["attrs." + attr + ".record"] = record[attr];
    }

    let queryObj = {};
    for (const key in queries) {
      queryObj[`attrs.${key}.value`] = queries[key];
    }
    const filter = {
      ...(id && { _id: ObjectId(id) }),
      ...(parent && { parent: ObjectId(parent) }),
      ...(ancestor && { path: new RegExp(ancestor) }),
      ...queryObj,
    };
    const update = { $set: setObj };
    const options = { projection: projectionObj, returnOriginal: false };
    const result = await Entity.findOneAndUpdate(filter, update, options);

    // record feature
    const updatedEntity = result.value;
    const attrs = updatedEntity.attrs;
    await Promise.all(
      Object.entries(attrs).map(async ([attrName, attr]) => {
        if (attr.type === "data" && attr.record === true) {
          const samples = [{ v: attr.value, t: attrs.lastTelemetry.value }];
          return await RecordDAO.upsert(updatedEntity._id, attrName, samples);
        }
      })
    );

    return { ok: result.ok };
  }

  // deleteById
  static async deleteById(id) {
    const filter = { _id: ObjectId(id) };
    return (await Entity.deleteOne(filter)).result;
  }

  // deleteMany
  static async deleteMany({ ids, parent, ancestor, queries }) {
    let queryObj = {};
    for (const key in queries) {
      queryObj[`attrs.${key}.value`] = queries[key];
    }
    const filter = {
      ...(ids && { _id: { $in: ObjectIdsArr(ids) } }),
      ...(parent && { parent: ObjectId(parent) }),
      ...(ancestor && { path: new RegExp(ancestor) }),
      ...queryObj,
    };
    return (await Entity.deleteMany(filter)).result;
  }

  // getRecordsForOne
  static async getRecordsForOne({ id, attrs, from, to, date }) {
    if (!id || !attrs) return null;
    const query = { _id: ObjectId(id) };
    const options = { projection: { attrs: 1 } };
    const entity = await Entity.findOne(query, options);

    let result = { id: entity._id };

    const attrsArr = Array.isArray(attrs) ? attrs : attrs.split(",");
    for (const attr of attrsArr) {
      result[attr] = await solveRecords({
        entity: entity._id,
        attrsObj: entity.attrs,
        attr,
        from,
        to,
        date,
      });
    }
    return result;
  }
}

// STATIC FUNCTIONS

async function solveAttr(attrsObj, key) {
  const attr = attrsObj[key];
  if (attr) {
    const type = attr.type;
    switch (type) {
      case "data":
        return attr.value;
      case "link":
        const id = attr.target.entity;
        const attr1 = attr.target.attr;
        const result = await EntityDAO.getById(id, attr1);
        if (result && result[attr1]) return result[attr1];
        else return null;
      case "alias":
        return solveAttr(attrsObj, attr.target);
      default:
        return null;
    }
  } else return null;
}

async function solveRecords({ entity, attrsObj, attr: key, from, to, date }) {
  const attr = attrsObj[key];
  if (attr) {
    const type = attr.type;
    switch (type) {
      case "data":
        return RecordDAO.get({ entity, attr: key, from, to, date });
      case "link":
        const tarId = attr.target.entity;
        const tarAttr = attr.target.attr;
        const result = await EntityDAO.getRecordsForOne({
          id: tarId,
          attrs: tarAttr,
          from,
          to,
          date,
        });
        if (result && result[tarAttr]) return result[tarAttr];
        else return null;
      case "alias":
        return solveRecords({
          entity,
          attrsObj,
          attr: attr.target,
          from,
          to,
          date,
        });
      default:
        return null;
    }
  } else return null;
}

function ObjectIdsArr(ids) {
  let idsArr = Array.isArray(ids) ? ids : ids.split(",");
  return idsArr.map((id) => ObjectId(id));
}

module.exports = EntityDAO;
