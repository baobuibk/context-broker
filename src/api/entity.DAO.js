const ObjectId = require("mongodb").ObjectId;

const RecordDAO = require("./record.DAO");
const Schema = require("../schemas/entity.schema");

let Entity;
const collName = "entities";

class EntityDAO {
  static async addSchema(db) {
    const collList = await db
      .listCollections({ name: collName }, { nameOnly: true })
      .toArray();

    if (collList.length) {
      await db.command({ collMod: collName, validator: Schema });
      console.log(`modified ${collName} schema`);
    } else {
      await db.createCollection(collName, { validator: Schema });
      console.log(`created ${collName} schema`);
    }
  }

  static inject(db) {
    if (!Entity) Entity = db.collection(collName);
  }

  /**
   * Create a new entity
   * @param {Object} props Passed information
   * @param {string} props.parent id of parent entity
   * @param {Object} props.data data of new entity
   * @param {Object} props.alias alias of new entity
   * @param {Object} props.link link of new entity
   * @param {Object} props.record which attrs to record history
   * @returns {Object}
   */
  static async add(props) {
    const { parent: parentId, data, alias, link, record } = props;

    const parentEntity = parentId
      ? await Entity.findOne(
          { _id: ObjectId(parentId) },
          { projection: { path: 1 } }
        )
      : null;
    const path = parentEntity
      ? parentEntity.path
        ? parentEntity.path + "," + parentId
        : parentId
      : "";

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
        target: {
          entity: ObjectId(link[attr].entity),
          attr: link[attr].attr,
        },
      };
    }
    for (const attr in record) {
      if (record[attr]) attrsObj[attr].record = true;
    }

    const newEntity = {
      path,
      parent: parentId ? ObjectId(parentId) : null,
      attrs: attrsObj,
    };
    const { insertedId } = await Entity.insertOne(newEntity);
    let result = { id: insertedId };
    for (const key in attrsObj) {
      const attr = attrsObj[key];
      result[key] =
        attr.type === "data"
          ? attr.value
          : attr.type === "link"
          ? "link"
          : attr.type === "alias"
          ? "alias"
          : "unknown";
    }

    return result;
  }

  // upsertOne
  static async upsertOne(props) {
    const { parent: parentId, data, alias, link, record, queries } = props;

    const parentEntity = parentId
      ? await Entity.findOne(
          { _id: ObjectId(parentId) },
          { projection: { path: 1 } }
        )
      : null;
    const path = parentEntity
      ? parentEntity.path
        ? parentEntity.path + "," + parentId
        : parentId
      : "";

    let setObj = {
      path,
      parent: parentId ? ObjectId(parent) : null,
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
        target: {
          entity: ObjectId(link[attr].entity),
          attr: link[attr].attr,
        },
      };
    }
    for (const attr in record) {
      if (record[attr]) setObj["attrs." + attr + ".record"] = true;
    }

    let queryObj = {};
    for (const key in queries) {
      queryObj[`attrs.${key}.value`] = queries[key];
    }
    const filter = {
      ...(parentId && { parent: ObjectId(parentId) }),
      ...queryObj,
    };
    const update = { $set: setObj };
    const options = { upsert: true };
    const {
      result,
      modifiedCount: mod,
      upsertedCount: ups,
      matchedCount: mat,
    } = await Entity.updateOne(filter, update, options);

    const ok = result.ok;
    const status =
      !mod && !ups && mat
        ? "unmodified"
        : mod && !ups && mat
        ? "modified"
        : !mod && ups && !mat
        ? "upserted"
        : "error";
    return { ok, status };
  }

  // getById
  static async getById(id, attrs) {
    const query = { _id: ObjectId(id) };
    const options = { projection: { attrs: 1, _id: 0 } };
    const entity = await Entity.findOne(query, options);
    if (!entity) return null;

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
            : "unknown";
      }
    result.id = id;
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
    return await Promise.all(
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
  static async updateOne(props) {
    const {
      id,
      parent,
      ancestor,
      data,
      alias,
      link,
      record,
      queries,
      timestamp,
    } = props;

    let setObj = {};
    let projectionObj = {};
    for (const attr in data) {
      setObj["attrs." + attr + ".type"] = "data";
      setObj["attrs." + attr + ".value"] = data[attr];
      projectionObj["attrs." + attr] = 1;
    }
    for (const attr in alias) {
      setObj["attrs." + attr] = { type: "alias", target: alias[attr] };
      projectionObj["attrs." + attr] = 1;
    }
    for (const attr in link) {
      setObj["attrs." + attr] = {
        type: "link",
        target: {
          entity: ObjectId(link[attr].entity),
          attr: link[attr].attr,
        },
      };
      projectionObj["attrs." + attr] = 1;
    }
    for (const attr in record) {
      if (record[attr]) setObj["attrs." + attr + ".record"] = true; //!!!
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
          const sample = {
            v: attr.value,
            t: timestamp ? timestamp : new Date(),
          };
          return await RecordDAO.addOneSample(
            updatedEntity._id,
            attrName,
            sample
          );
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

  // Get records for entity with specific id
  static async getRecordsById(props) {
    const { id, attrs, year, month, day, hour, minute, half, quarter, filter } =
      props;

    if (!id || !attrs || !year || !month)
      throw new Error("need id, attrs, year, month");

    const query = { _id: ObjectId(id) };
    const options = { projection: { attrs: 1, _id: 0 } };
    const entity = await Entity.findOne(query, options);
    if (!entity) throw new Error("entity not found");

    let result = { id };

    const attrsArr = Array.isArray(attrs) ? attrs : attrs.split(",");
    for (const attr of attrsArr) {
      result[attr] = await solveRecords({
        entity: id,
        attrsObj: entity.attrs,
        attrName: attr,
        year,
        month,
        day,
        hour,
        minute,
        half,
        quarter,
        filter,
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

async function solveRecords(props) {
  const {
    entity,
    attrsObj,
    attrName,
    year,
    month,
    day,
    hour,
    minute,
    half,
    quarter,
    filter,
  } = props;

  const attr = attrsObj[attrName];
  if (attr) {
    const type = attr.type;
    switch (type) {
      case "data":
        return RecordDAO.get({
          entity,
          attr: attrName,
          year,
          month,
          day,
          hour,
          minute,
          half,
          quarter,
          filter,
        });
      case "link":
        const targetEntity = attr.target.entity;
        const targetAttr = attr.target.attr;
        const result = await EntityDAO.getRecordsById({
          id: targetEntity,
          attrs: targetAttr,
          year,
          month,
          day,
          hour,
          minute,
          half,
          quarter,
          filter,
        });
        if (result && result[targetAttr]) return result[targetAttr];
        else return null;
      case "alias":
        return solveRecords({
          entity,
          attrsObj,
          attrName: attr.target,
          year,
          month,
          day,
          hour,
          minute,
          half,
          quarter,
          filter,
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
