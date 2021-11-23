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

  static async createEntity() {}
  static async addAttribute() {}
  static async listEntities() {}
  static async retrieveEntity() {}
  static async updateAttribute() {}
  static async updateAttributes() {}
  static async deleteEntity() {}
  static async deleteAttribute() {}

  static async add(entity) {
    let newEntity = {};

    for (const [attrName, attrData] of Object.entries(entity)) {
      if (
        Array.isArray(attrData) ||
        typeof attrData === "number" ||
        typeof attrData === "boolean" ||
        typeof attrData === "string"
      ) {
        newEntity[attrName] = { type: "property", value: attrData };
      } else if (typeof attrData === "object" && attrData !== null) {
        const { type, target, value, ...metaData } = attrData;
        if (type === "alias" || type === "link") {
          newEntity[attrName] = { type, target };
        } else {
          newEntity[attrName] = { type: "property", value, ...metaData };
        }
      } else {
        throw new Error("entity add error");
      }
    }

    const { insertedId } = await Entity.insertOne(newEntity);
    return insertedId;
  }

  // getById
  static async getById({ id, attrs, options }) {
    const entity = await Entity.findOne({ _id: ObjectId(id) });
    return entity ? await solveEntity({ entity, attrs, options }) : null;
  }

  // getMany
  static async get({ q, attrs, options }) {
    let _query = {};
    for (const [attrName, attrValue] of Object.entries(q)) {
      _query[attrName + ".value"] = attrValue;
    }

    const entities = await Entity.find(_query).toArray();
    return await Promise.all(
      entities.map(async (entity) => solveEntity({ entity, attrs, options }))
    );
  }

  // updateOne
  static async updateById({ id, updates, options, timestamp }) {
    let setObj = {};
    if (options === "value") {
      for (const attr in updates) {
        setObj[attr + ".value"] = updates[attr];
      }
    } else if (options === "attr") {
      for (const [attrName, attrData] of Object.entries(updates)) {
        if (typeof attrData === "object" && attrData !== null) {
          const { value, ...valid } = attrData;

          for (const [metaKey, metaValue] of Object.entries(valid)) {
            setObj[attrName + "." + metaKey] = metaValue;
          }
        } else throw new Error("wrong options or updates");
      }
    } else throw new Error("wrong options format");

    console.log(setObj);

    let result = await Entity.findOneAndUpdate(
      { _id: ObjectId(id) },
      { $set: setObj }
    );

    if (!result.value) throw new Error("entity not found");

    console.log(result);

    if (options === "value") {
      redisClient.publish(
        "context-broker." + id,
        JSON.stringify({ updates, ...(timestamp && { timestamp }) })
      );
    }
  }

  static async update({ q: _q, updates, options, timestamp }) {
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

async function solveEntity({ entity, attrs, options }) {
  let { _id, ..._entity } = entity;
  let result = { id: _id };

  let attrNameArr = attrs
    ? Array.isArray(attrs)
      ? attrs
      : attrs.split(",")
    : Object.keys(_entity);

  for (const attrName of attrNameArr) {
    result[attrName] = await solveAttr(_entity, attrName, options);
  }

  return result;
}

async function solveAttr(entity, attrName, options) {
  const attrData = entity[attrName];
  if (attrData) {
    if (!options) {
      return attrData;
    }

    if (options === "keyValue") {
      const type = attrData.type;
      if (type === "alias") {
        return solveAttr(entity, attrData.target, options);
      } else if (type === "link") {
        let [entityId, attr] = attrData.target.split(".");
        let targetEntity = await EntityDAO.getById({
          id: entityId,
          options: "keyValue",
        });

        console.log("target", targetEntity);
        return targetEntity ? targetEntity[attr] : null;
      } else if (type === "property") {
        return attrData.value;
      } else return null;
    }
  } else return null;
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
