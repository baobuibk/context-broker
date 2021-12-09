const { ObjectId } = require("mongodb");
const debug = require("debug")("EntityDAO");
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

  static async addOne(data) {
    let newEntity = makeNewEntity(data);
    let result = await Entity.insertOne(newEntity);
    debug(result);
  }

  static async addMany(data) {
    if (!Array.isArray(data)) throw new Error("entities");

    let newEntities = data.map(makeNewEntity);
    let result = await Entity.insertMany(newEntities);
    debug(result);
  }

  static async getById({ id, attrs, options }) {
    if (!ObjectId.isValid(id)) throw new Error("id");

    let filter = { ...(id && { _id: ObjectId(id) }) };
    const entity = await Entity.findOne(filter);
    return entity ? await solveEntity(entity, { attrs, options }) : null;
  }

  static async getMany({ ids, type, q, attrs, options }) {
    let query = {};
    if (q) {
      let _q = typeof q === "string" ? JSON.parse(q) : q;
      for (const [attrName, attrValue] of Object.entries(_q)) {
        query[attrName + ".value"] = attrValue;
      }
    }

    let filter = {
      ...(ids && { _id: { $in: solveList(ids).map((id) => ObjectId(id)) } }),
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

  static async updateValue({ id, data, timestamp }) {
    if (!ObjectId.isValid(id)) throw new Error("id");

    //
    let notifyObject = { timestamp, data: {} };
    //
    let setObj = {};
    for (const [attr, attrData] of Object.entries(data)) {
      if (
        Array.isArray(attrData) ||
        typeof attrData === "number" ||
        typeof attrData === "boolean" ||
        typeof attrData === "string"
      ) {
        setObj[attr + ".value"] = attrData;
        setObj[attr + ".type"] = "Property";

        //
        notifyObject.data[attr] = attrData;
        //
      } else {
        throw new Error("not value");
      }
    }

    let result = await Entity.findOneAndUpdate(
      { _id: ObjectId(id) },
      { $set: setObj }
    );

    if (!result.ok) throw new Error("mongodb");
    if (!result.value) throw new Error("id not found");

    redisClient.publish("context-broker." + id, JSON.stringify(notifyObject));
  }

  static async updateAttribute({ id, data }) {
    if (!ObjectId.isValid(id)) throw new Error("id");
    Entity.findOne({ _id: ObjectId(id) });

    let setObj = {};
    for (const [attr, attrData] of Object.entries(data)) {
      if (isValidObject(attrData)) {
        const { type, target, value } = attrData;

        if (type === "Alias" && isValidString(target?.attr)) {
          setObj[attr + ".type"] = "Alias";
          setObj[attr + ".target"] = { attr: target.attr };
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
        } else if (type === "Property") {
          setObj[attr + ".type"] = "Property";
          setObj[attr + ".value"] = value;
        } else {
          throw new Error("attributes");
        }
      } else {
        throw new Error("attributes");
      }
    }

    let result = await Entity.findOneAndUpdate(
      { _id: ObjectId(id) },
      { $set: setObj }
    );

    if (!result.ok) throw new Error("mongodb error");
    if (!result.value) throw new Error("not found");
  }

  static async deleteById({ id }) {
    if (!ObjectId.isValid(id)) throw new Error("id");

    let filter = { ...(id && { _id: ObjectId(id) }) };
    await Entity.deleteOne(filter);
  }

  static async deleteMany({ ids, type, q }) {
    let query = {};
    if (q) {
      let _q = typeof q === "string" ? JSON.parse(q) : q;
      for (const [attrName, attrValue] of Object.entries(_q)) {
        query[attrName + ".value"] = attrValue;
      }
    }

    let filter = {
      ...(ids && { _id: { $in: solveList(ids).map((id) => ObjectId(id)) } }),
      ...(type && { type: { $in: solveList(type) } }),
      ...query,
    };

    await Entity.deleteMany(filter);
  }

  static async getRecordById(props) {
    const { id, attrs, options } = props;

    const entity = await Entity.findOne({ _id: ObjectId(id) });
    if (!entity) return null;

    return solveEntityRecord({ entity, attrs, options });
  }

  static async getRecordMany({}) {
    return null;
  }
}

// STATIC FUNCTIONS

let sysAttrs = ["_id", "type"];

async function solveEntity(entity, { attrs, options }) {
  let result = { id: entity._id, type: entity.type };
  let attrList = attrs ? solveList(attrs) : Object.keys(entity);
  let filteredList = attrList.filter((attr) => !sysAttrs.includes(attr));
  for (const attr of filteredList) {
    result[attr] = await solveEntityAttr(entity, attr, options);
  }
  return result;
}

async function solveEntityAttr(entity, attr, options) {
  const attrData = entity[attr];

  if (attrData) {
    if (!options) return attrData;
    else if (options === "valueOnly") {
      const type = attrData.type;
      const target = attrData.target;
      if (type === "Alias") {
        return solveEntityAttr(entity, target.attr, options);
      } else if (type === "Link") {
        let targetEntity = await EntityDAO.getById({
          id: target.id,
          attrs: target.attr,
          options,
        });
        console.log(targetEntity);
        return targetEntity ? targetEntity[target.attr] : null;
      } else if (type === "Property") {
        return attrData.value;
      } else return null;
    }
  } else return null;
}

async function solveEntityRecord({ entity, attrs, options }) {
  let result = { id: entity._id, type: entity.type };

  let attrList = attrs ? solveList(attrs) : Object.keys(entity);
  let filteredList = attrList.filter((attr) => !sysAttrs.includes(attr));

  for (const attr of filteredList) {
    result[attr] = await solveRecord(entity, attr, options);
  }
  return result;
}

const recordEngineUrl = process.env.RECORD_ENGINE_URL;
async function solveRecord(entity, attr, options) {
  const attrData = entity[attr];

  if (attrData) {
    const type = attrData.type;
    const target = attrData.target;

    if (type === "Alias") {
      return solveRecord(entity, target.attr, options);
    } else if (type === "Link") {
      let targetEntity = await EntityDAO.getRecordById({
        id: target.id,
        attrs: target.attr,
        options,
      });
      return targetEntity ? targetEntity[target.attr] : null;
    } else if (type === "Property") {
      const url = recordEngineUrl + "/api/record/get";
      return await axios
        .get(url, {
          params: {
            id: entity._id,
            attr,
            ...options,
          },
        })
        .then((response) => response.data)
        .catch((error) => {
          debug("get record error: " + error.message);
          return null;
        });
    } else {
      debug("type not recognize");
      return null;
    }
  } else {
    debug("no " + attr + " in " + entity._id);
    return null;
  }
}

function isValidString(str) {
  return !str || typeof str !== "string" || !str.length ? false : true;
}
function isValidObject(obj) {
  return !Array.isArray(obj) && typeof obj === "object" && obj !== null
    ? true
    : false;
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
  const { type, ...attributes } = entity;
  if (!isValidString(type)) throw new Error("type");

  let newEntity = { type };

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
