const { ObjectId } = require("mongodb");
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
    console.log(result);
  }

  static async createEntity(entityId, entityType, attributes) {
    let errors = {};

    if (!isValidString(entityId)) errors.id = "error";
    if (!isValidString(entityType)) errors.type = "error";
    let { id, type, ...validAttributes } = attributes;
    if (id || type) errors.attributes = "error";
    if (!_.isEmpty(errors)) return { errors };

    let newEntity = { id: entityId, type: entityType };

    for (const [attributeName, attributeData] of Object.entries(
      validAttributes
    )) {
      if (
        Array.isArray(attributeData) ||
        typeof attributeData === "number" ||
        typeof attributeData === "boolean" ||
        typeof attributeData === "string"
      ) {
        newEntity[attributeName] = { type: "Property", value: attributeData };
      } else if (isValidObject(attributeData)) {
        const { type, target, value, ...metadata } = attributeData;

        if (type === "Alias" && isValidString(target?.attr)) {
          newEntity[attributeName] = {
            type: "Alias",
            target: { attr: target.attr },
            ...metadata,
          };
        } else if (
          type === "Link" &&
          isValidString(target?.attr) &&
          isValidString(target?.id)
        ) {
          newEntity[attributeName] = {
            type: "Link",
            target: { id: target.id, attr: target.attr },
            ...metadata,
          };
        } else if (type === "Property") {
          newEntity[attributeName] = { type: "Property", value, ...metadata };
        } else {
          if (errors.attributes) errors.attributes[attributeName] = "error";
          else errors.attributes = { [attributeName]: "error" };
        }
      } else {
        if (errors.attributes) errors.attributes[attributeName] = "error";
        else errors.attributes = { [attributeName]: "error" };
      }

      if (!_.isEmpty(errors)) return { errors };
    }

    await Entity.insertOne(newEntity);
    return { ok: 1 };
  }

  static async addAttribute(entityId, attributes) {
    let errors = {};

    if (!isValidString(entityId)) errors.entityId = "error";
    if (!isValidObject(attributes) || _.isEmpty(attributes))
      errors.attributes = "error";
    let { id, type, ...validAttributes } = attributes;
    if (id || type) errors.attributes = "error";
    if (!_.isEmpty(errors)) return { errors };

    let setObj = {};

    for (const [attributeName, attributeData] of Object.entries(
      validAttributes
    )) {
      if (
        Array.isArray(attributeData) ||
        typeof attributeData === "number" ||
        typeof attributeData === "boolean" ||
        typeof attributeData === "string"
      ) {
        setObj[attributeName] = { type: "Property", value: attributeData };
      } else if (isValidObject(attributeData)) {
        const { type, target, value, ...metadata } = attributeData;

        if (type === "Alias" && isValidString(target?.attr)) {
          setObj[attributeName] = {
            type: "Alias",
            target: { attr: target.attr },
            ...metadata,
          };
        } else if (
          type === "Link" &&
          isValidString(target?.attr) &&
          isValidString(target?.id)
        ) {
          setObj[attributeName] = {
            type: "Link",
            target: { id: target.id, attr: target.attr },
            ...metadata,
          };
        } else if (type === "Property") {
          setObj[attributeName] = { type: "Property", value, ...metadata };
        } else {
          if (errors.attributes) errors.attributes[attributeName] = "error";
          else errors.attributes = { [attributeName]: "error" };
        }
      } else {
        if (errors.attributes) errors.attributes[attributeName] = "error";
        else errors.attributes = { [attributeName]: "error" };
      }

      if (!_.isEmpty(errors)) return { errors };
    }

    console.log("setObj: ", setObj);

    let result = await Entity.findOneAndUpdate(
      { id: entityId },
      { $set: setObj }
    );

    console.log("result:", result);

    if (result.value) return { ok: 1 };

    throw new Error("dont know");

    // redisClient.publish(
    //   "context-broker." + id,
    //   JSON.stringify({ updates, ...(timestamp && { timestamp }) })
    // );
  }

  static async batchUpsert(entities) {
    let newEntities = entities.map((entity) => {
      let { id, type, ...attributes } = entity;

      if (!isValidString(id)) throw new Error("id");
      if (!isValidString(type)) throw new Error("type");

      let newEntity = { id, type };

      for (const [attributeName, attributeData] of Object.entries(attributes)) {
        if (
          Array.isArray(attributeData) ||
          typeof attributeData === "number" ||
          typeof attributeData === "boolean" ||
          typeof attributeData === "string"
        ) {
          newEntity[attributeName] = { type: "Property", value: attributeData };
        } else if (isValidObject(attributeData)) {
          const { type, target, value, ...metadata } = attributeData;

          if (type === "Alias" && isValidString(target?.attr)) {
            newEntity[attributeName] = {
              type: "Alias",
              target: { attr: target.attr },
              ...metadata,
            };
          } else if (
            type === "Link" &&
            isValidString(target?.attr) &&
            isValidString(target?.id)
          ) {
            newEntity[attributeName] = {
              type: "Link",
              target: { id: target.id, attr: target.attr },
              ...metadata,
            };
          } else if (type === "Property") {
            newEntity[attributeName] = { type: "Property", value, ...metadata };
          } else {
            throw new Error("attribute");
          }
        } else {
          throw new Error("dont know");
        }

        return newEntity;
      }
    });

    const result = await Entity.insertMany(entities);
    console.log(result);
    return { ok: 1, n: result.insertedCount };
  }

  static async listEntities({ id, type, attrs, options, q }) {
    let query = parseQuery(q);

    let filter = {
      ...(id && { id: { $in: solveList(id) } }),
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

  static async retrieveEntity(entityId, { type, attrs, options, q }) {
    let query = parseQuery(q);

    let filter = {
      ...(entityId && { id: entityId }),
      ...(type && { type: { $in: solveList(type) } }),
      ...query,
    };

    const entity = await Entity.findOne(filter);
    return entity ? await solveEntity(entity, { attrs, options }) : null;
  }

  static async updateAttributes(entityId, attributes, options) {
    let { timestamp } = options;
    let errors = {};

    if (!isValidString(entityId)) errors.entityId = "error";
    if (!isValidObject(attributes) || _.isEmpty(attributes))
      errors.attributes = "error";
    let { id, type, ...validAttributes } = attributes;
    if (id || type) errors.attributes = "error";
    if (!_.isEmpty(errors)) return { errors };

    let setObj = {};
    let notifyObject = { timestamp, attributes: {} };

    for (const [attributeName, attributeData] of Object.entries(
      validAttributes
    )) {
      if (
        Array.isArray(attributeData) ||
        typeof attributeData === "number" ||
        typeof attributeData === "boolean" ||
        typeof attributeData === "string"
      ) {
        setObj[attributeName + ".type"] = "Property";
        setObj[attributeName + ".value"] = attributeData;

        //
        notifyObject.attributes[attributeName] = attributeData;
        //
      } else if (isValidObject(attributeData)) {
        const { type, target, value, ...metadata } = attributeData;

        if (type === "Alias" && isValidString(target?.attr)) {
          setObj[attributeName + ".type"] = "Alias";
          setObj[attributeName + ".target"] = { attr: target.attr };
          for (const [meta, data] of Object.entries(metadata)) {
            setObj[attributeName + "." + meta] = data;
          }
        } else if (
          type === "Link" &&
          isValidString(target?.attr) &&
          isValidString(target?.id)
        ) {
          setObj[attributeName + ".type"] = "Link";
          setObj[attributeName + ".target"] = {
            id: target.id,
            attr: target.attr,
          };
          for (const [meta, data] of Object.entries(metadata)) {
            setObj[attr + "." + meta] = data;
          }
        } else if (type === "Property") {
          setObj[attributeName + ".type"] = "Property";
          setObj[attributeName + ".value"] = value;
          for (const [meta, data] of Object.entries(metadata)) {
            setObj[attr + "." + meta] = data;
          }

          //
          notifyObject.attributes[attributeName] = value;
          //
        } else {
          if (errors.attributes) errors.attributes[attributeName] = "error";
          else errors.attributes = { [attributeName]: "error" };
        }
      } else {
        if (errors.attributes) errors.attributes[attributeName] = "error";
        else errors.attributes = { [attributeName]: "error" };
      }

      if (!_.isEmpty(errors)) return { errors };
    }

    let result = await Entity.findOneAndUpdate(
      { id: entityId },
      { $set: setObj }
    );

    if (!result.ok) return { errors: "not found" };
    if (!result.value) return { errors: "not found" };

    redisClient.publish(
      "context-broker." + entityId,
      JSON.stringify(notifyObject)
    );

    return { ok: 1 };
  }
  static async deleteEntity(entityId) {
    await Entity.deleteOne({ id: entityId });
    return { ok: 1 };
  }
  static async deleteAttribute(entityId, attribute) {
    console.log("got her");
    await Entity.findOneAndUpdate(
      { id: entityId },
      { $unset: { [attribute]: "" } }
    );
    return { ok: 1 };
  }

  // deleteById
  static async deleteById(id) {}

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
  const attributeData = entity[attr];

  if (attributeData) {
    if (!options) {
      return attributeData;
    }

    if (options === "keyValues") {
      const type = attributeData.type;
      const target = attributeData.target;
      if (type === "Alias") {
        return solveAttr(entity, target.attr, options);
      } else if (type === "Link") {
        let targetEntity = await EntityDAO.retrieveEntity(target.id, {
          attrs: target.attr,
          options,
        });
        return targetEntity ? targetEntity[attr] : null;
      } else if (type === "Property") {
        return attributeData.value;
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

module.exports = EntityDAO;
