const { ObjectId } = require("mongodb");
const redisClient = require("../redis");
const Schema = require("./entity.schema");
const axios = require("axios");

let Entity;
const collName = "entity";

class EntityDAO {
  static async init(db) {
    const collList = await db
      .listCollections({ name: collName }, { nameOnly: true })
      .toArray();

    if (collList.length)
      await db.command({ collMod: collName, validator: Schema });
    else await db.createCollection(collName, { validator: Schema });

    if (!Entity) Entity = db.collection(collName);
  }

  static async add({ attrs, parentId }) {
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

    let newEntity = {
      path,
      parentId: parentId ? ObjectId(parentId) : null,
      attrs: {},
    };

    for (const [attrName, attr] of Object.entries(attrs)) {
      if (typeof attr === "object" && !Array.isArray(attr) && attr !== null) {
        if (attr.type === "alias") {
          newEntity.attrs[attrName] = {
            type: attr.type,
            target: { attr: attr.target.attr },
          };
        } else if (attr.type === "link") {
          newEntity.attrs[attrName] = {
            type: attr.type,
            target: {
              entityId: ObjectId(attr.target.entityId),
              attr: attr.target.attr,
            },
          };
        } else if (attr.type === "number") {
          newEntity.attrs[attrName] = {
            type: attr.type,
            value: attr.value,
            ...attr,
          };
        } else if (attr.type === "string") {
          newEntity.attrs[attrName] = {
            type: attr.type,
            value: attr.value,
            ...attr,
          };
        } else if (attr.type === "boolean") {
          newEntity.attrs[attrName] = {
            type: attr.type,
            value: attr.value,
            ...attr,
          };
        } else throw new Error("wrong attr format");
      } else if (
        typeof attr === "number" ||
        typeof attr === "boolean" ||
        typeof attr === "string"
      ) {
        newEntity.attrs[attrName] = { type: typeof attr, value: attr };
      } else throw new Error("wrong attr format");
    }

    const { insertedId } = await Entity.insertOne(newEntity);
    return insertedId;
  }

  // getById
  static async getById(id, attrs) {
    const query = { _id: ObjectId(id) };
    const options = { projection: { attrs: 1 } };
    const entity = await Entity.findOne(query, options);
    if (!entity) return null;

    return solveEntityAttrs(entity, attrs);
  }

  // getMany
  static async getMany({ ids, parentId, ancestorId, attrs, queries }) {
    let queryObj = {};
    for (const key in queries) {
      queryObj[`attrs.${key}.value`] = queries[key];
    }
    const query = {
      ...(ids && { _id: { $in: ObjectIdsArr(ids) } }),
      ...(parentId && { parentId: ObjectId(parentId) }),
      ...(ancestorId && { path: new RegExp(ancestorId) }),
      //  path = new RegExp(parent + "$");
      ...queryObj,
    };

    const options = { projection: { attrs: 1 } };
    const entitiesArr = await Entity.find(query, options).toArray();

    return await Promise.all(
      entitiesArr.map(async (entity) => solveEntityAttrs(entity, attrs))
    );
  }

  // updateOne
  static async updateOneById(id, attrs) {
    const filter = { ...(id && { _id: ObjectId(id) }) };

    let setObj = {};
    for (const attr in attrs) {
      setObj["attrs." + attr + ".value"] = attrs[attr];
    }
    const update = { $set: setObj };

    let projectionObj = {};
    const options = { projection: projectionObj, returnOriginal: false };
    await Entity.findOneAndUpdate(filter, update, options);

    redisClient.publish("context-broker." + id, JSON.stringify(attrs));
  }

  static async updateOne({ ids, parentId, ancestorId, attrs, queries }) {
    let queryObj = {};
    for (const key in queries) {
      queryObj[`attrs.${key}.value`] = queries[key];
    }
    let filter = {
      ...(ids && { _id: { $in: ObjectIdsArr(ids) } }),
      ...(parentId && { parentId: ObjectId(parentId) }),
      ...(ancestorId && { path: new RegExp(ancestorId) }),
      //  path = new RegExp(parent + "$");
      ...queryObj,
    };

    let setObj = {};
    for (const attr in attrs) {
      setObj["attrs." + attr + ".value"] = attrs[attr];
    }
    const update = { $set: setObj };

    const updateResult = await Entity.findOneAndUpdate(filter, update);

    if (updateResult.value) {
      redisClient.publish(
        "context-broker." + updateResult.value._id.toString(),
        JSON.stringify(attrs)
      );
    }
  }

  // deleteById
  static async deleteById(id) {
    const filter = { _id: ObjectId(id) };
    await Entity.deleteOne(filter);
  }

  // deleteMany
  static async deleteMany({ ids, parentId, ancestorId, queries }) {
    let queryObj = {};
    for (const key in queries) {
      queryObj[`attrs.${key}.value`] = queries[key];
    }
    const filter = {
      ...(ids && { _id: { $in: ObjectIdsArr(ids) } }),
      ...(parentId && { parentId: ObjectId(parentId) }),
      ...(ancestorId && { path: new RegExp(ancestorId) }),
      ...queryObj,
    };
    await Entity.deleteMany(filter);
  }

  static async getRecordById(props) {
    const { id, attrs, options } = props;

    const entity = await Entity.findOne(
      { _id: ObjectId(id) },
      { projection: { attrs: 1 } }
    );
    if (!entity) return { id: id };

    return solveEntityRecord({ entity, attrs, options });
  }
}

// STATIC FUNCTIONS

function ObjectIdsArr(ids) {
  let idsArr = Array.isArray(ids) ? ids : ids.split(",");
  return idsArr.map((id) => ObjectId(id));
}

async function solveAttr(attrsObj, key) {
  const attr = attrsObj[key];
  if (attr) {
    const type = attr.type;
    switch (type) {
      case "alias":
        return solveAttr(attrsObj, attr.target.attr);
      case "link":
        const id = attr.target.entityId;
        const targetAttr = attr.target.attr;
        const result = await EntityDAO.getById(id, targetAttr);
        return result[targetAttr];

      default:
        return attr.value;
    }
  } else return null;
}

async function solveEntityAttrs(entity, attrs) {
  const attrsObj = entity.attrs;
  let result = { id: entity._id };

  if (attrs) {
    const attrsArr = Array.isArray(attrs) ? attrs : attrs.split(",");
    for (const key of attrsArr) {
      result[key] = await solveAttr(attrsObj, key);
    }
  } else
    for (const key in attrsObj) {
      result[key] = await solveAttr(attrsObj, key);
    }
  return result;
}

const recordEngineUrl = process.env.RECORD_ENGINE_URL;
async function solveRecord(attrsObj, entityId, key, options) {
  const attr = attrsObj[key];
  if (attr) {
    const type = attr.type;
    switch (type) {
      case "alias":
        return solveRecord(attrsObj, entityId, attr.target.attr, options);
      case "link":
        const targetId = attr.target.entityId;
        const targetAttr = attr.target.attr;
        const result = await EntityDAO.getRecordById({
          id: targetId,
          attrs: targetAttr,
          options,
        });
        return result[targetAttr];
      default:
        const url = recordEngineUrl + "/api/record/get";
        return await axios
          .get(url, {
            params: {
              entityId,
              attr: key,
              ...options,
            },
          })
          .then((response) => response.data)
          .catch((error) => {
            throw new Error(error.message);
          });
    }
  } else return null;
}

async function solveEntityRecord({ entity, attrs, options }) {
  let entityId = entity._id.toString();
  let attrsObj = entity.attrs;
  let result = { id: entityId };

  if (attrs) {
    const attrsArr = Array.isArray(attrs) ? attrs : attrs.split(",");
    for (const key of attrsArr) {
      result[key] = await solveRecord(attrsObj, entityId, key, options);
    }
  } else
    for (const key in attrsObj) {
      result[key] = await solveRecord(attrsObj, entityId, key, options);
    }

  return result;
}

module.exports = EntityDAO;
