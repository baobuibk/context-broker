const { ObjectId } = require("mongodb");
const debug = require("debug")("EntityDAO");
const redisClient = require("../redis");
const Schema = require("./entity.schema");
const axios = require("axios");
const _ = require("lodash");

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

    const result = await Entity.createIndex("id", { unique: true });
    debug(result);
  }

  static async addMany(entities) {
    if (!Array.isArray(entities)) throw new Error("entities");
    let newEntities = entities.map((entity) => makeNewEntity(entity));
    let result = await Entity.insertMany(newEntities);
    debug(result);
  }

  static async addOne(entity) {
    let newEntity = makeNewEntity(entity);
    let result = await Entity.insertOne(newEntity);
    debug(result);
  }

  static async getMany({ ids, type, attrs, options, q }) {
    let query = parseQuery(q);

    let filter = {
      ...(ids && { ids: { $in: solveList(ids) } }),
      ...(type && { type: { $in: solveList(type) } }),
      ...query,
    };

    const entities = await Entity.find(filter).toArray();
    return await Promise.all(
      entities.map(
        async (entity) => await solveEntity(entity, { attrs, options })
      )
    );
  }

  static async getOne(id, { type, attrs, options, q }) {
    let query = parseQuery(q);

    let filter = {
      ...(id && { id }),
      ...(type && { type: { $in: solveList(type) } }),
      ...query,
    };

    const entity = await Entity.findOne(filter);
    return entity ? await solveEntity(entity, { attrs, options }) : null;
  }

  static async updateBatch(updates, { timestamp }) {
    updates.map;
  }

  static async updateMany({ type, q }, update, { timestamp }) {
    return false;
  }

  static async updateOne(id, attributes, { timestamp }) {
    if (!isValidString(id)) throw new Error("id");
    //
    let notifyObject = { timestamp, attributes: {} };
    //
    let setObj = {};
    for (const [attr, attrData] of Object.entries(attributes)) {
      if (
        Array.isArray(attrData) ||
        typeof attrData === "number" ||
        typeof attrData === "boolean" ||
        typeof attrData === "string"
      ) {
        setObj[attr + ".type"] = "Property";
        setObj[attr + ".value"] = attrData;

        //
        notifyObject.attributes[attr] = attrData;
        //
      } else if (isValidObject(attrData)) {
        const { type, target, value, ...metadata } = attrData;

        if (type === "Alias" && isValidString(target?.attr)) {
          setObj[attr + ".type"] = "Alias";
          setObj[attr + ".target"] = { attr: target.attr };
          for (const [meta, data] of Object.entries(metadata)) {
            setObj[attr + "." + meta] = data;
          }
        } else if (
          type === "Link" &&
          isValidString(target?.attr) &&
          isValidString(target?.id)
        ) {
          setObj[attr + ".type"] = "Link";
          setObj[attr + ".target"] = {
            id: target.id,
            attr: target.attr,
          };
          for (const [meta, data] of Object.entries(metadata)) {
            setObj[attr + "." + meta] = data;
          }
        } else if (type === "Property") {
          setObj[attr + ".type"] = "Property";
          setObj[attr + ".value"] = value;
          for (const [meta, data] of Object.entries(metadata)) {
            setObj[attr + "." + meta] = data;
          }

          //
          notifyObject.attributes[attr] = value;
          //
        } else {
          throw new Error("attributes");
        }
      } else {
        throw new Error("attributes");
      }
    }

    let result = await Entity.findOneAndUpdate({ id }, { $set: setObj });

    if (!result.ok) throw new Error("mongodb");
    if (!result.value) throw new Error("id");

    redisClient.publish("context-broker." + id, JSON.stringify(notifyObject));
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

  static async deleteOne(id) {}

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

let sysAttrs = ["_id", "id", "type"];

async function solveEntity(entity, { attrs, options }) {
  let result = { id: entity.id, type: entity.type };
  let attrList = attrs ? solveList(attrs) : Object.keys(entity);
  let filteredList = attrList.filter((attr) => !sysAttrs.includes(attr));
  for (const attr of filteredList) {
    result[attr] = await solveAttr(entity, attr, options);
  }
  return result;
}

async function solveAttr(entity, attr, options) {
  const attrData = entity[attr];

  if (attrData) {
    if (!options) {
      return attrData;
    }

    if (options === "keyValues") {
      const type = attrData.type;
      const target = attrData.target;
      if (type === "Alias") {
        return solveAttr(entity, target.attr, options);
      } else if (type === "Link") {
        let targetEntity = await EntityDAO.retrieveEntity(target.id, {
          attrs: target.attr,
          options,
        });
        return targetEntity ? targetEntity[attr] : null;
      } else if (type === "Property") {
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
        const targetId = attr.target.id;
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
          .catch((errors) => {
            throw new Error(errors.message);
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

function isValidString(str) {
  return !str || typeof str !== "string" || !str.length ? false : true;
}
function isValidObject(obj) {
  return !Array.isArray(obj) && typeof obj === "object" && obj !== null
    ? true
    : false;
}

function parseQuery(q) {
  if (q) {
    let _q = typeof q === "string" ? JSON.parse(q) : q;
    let { id, type, ...valid_q } = _q;
    let query = {};
    for (const [attrName, attrValue] of Object.entries(valid_q)) {
      query[attrName + ".value"] = attrValue;
    }
    return query;
  }
  return {};
}

function solveList(list) {
  return list
    ? Array.isArray(list)
      ? list
      : typeof list === "string"
      ? list.split(",")
      : []
    : [];
}

function makeNewEntity(entity) {
  const { id, type, ...attributes } = entity;
  if (!isValidString(id)) throw new Error("id");
  if (!isValidString(type)) throw new Error("type");

  let newEntity = { id, type };

  for (const [attr, attrData] of Object.entries(attributes)) {
    if (
      Array.isArray(attrData) ||
      typeof attrData === "number" ||
      typeof attrData === "boolean" ||
      typeof attrData === "string"
    ) {
      newEntity[attr] = { type: "Property", value: attrData };
    } else if (isValidObject(attrData)) {
      const { type, target, value, ...metadata } = attrData;

      if (type === "Alias" && isValidString(target?.attr)) {
        newEntity[attr] = {
          type: "Alias",
          target: { attr: target.attr },
          ...metadata,
        };
      } else if (
        type === "Link" &&
        isValidString(target?.attr) &&
        isValidString(target?.id)
      ) {
        newEntity[attr] = {
          type: "Link",
          target: { id: target.id, attr: target.attr },
          ...metadata,
        };
      } else if (type === "Property") {
        newEntity[attr] = {
          type: "Property",
          value,
          ...metadata,
        };
      } else {
        throw new Error("attributes");
      }
    } else {
      throw new Error("attributes");
    }
  }

  return newEntity;
}

module.exports = EntityDAO;
