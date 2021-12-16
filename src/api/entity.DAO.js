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
    let newEntity = makeNewEntityObject(data);
    let result = await Entity.insertOne(newEntity);
    return { id: result.insertedId };
  }

  static async addMany(data) {
    if (!Array.isArray(data)) throw new Error("entities");
    let newEntities = data.map(makeNewEntityObject);
    let result = await Entity.insertMany(newEntities);
    return Object.entries(result.insertedIds).map((item) => {
      return { id: item[1] };
    });
  }

  static async upsertOne({ type, query, data }) {
    let queryObject = makeQueryObject(query);

    let filter = {
      ...(type && { type: { $in: solveList(type) } }),
      ...queryObject,
    };

    let setObject = makeSetObject(data);
    let options = { upsert: true };
    let result = await Entity.updateOne(filter, { $set: setObject }, options);

    if (result.matchedCount || result.upsertedCount) return true;
    return false;
  }

  static async getById({ id, attrs, options }) {
    if (!id || !ObjectId.isValid(id)) throw new Error("no id or invalid id");
    let filter = { ...(id && { _id: ObjectId(id) }) };
    const entity = await Entity.findOne(filter);
    return entity ? await solveEntity(entity, { attrs, options }) : null;
  }

  static async getMany({ ids, type, query, attrs, options }) {
    let queryObject = makeQueryObject(query);
    let filter = {
      ...(ids && { _id: { $in: solveList(ids).map((id) => ObjectId(id)) } }),
      ...(type && { type: { $in: solveList(type) } }),
      ...queryObject,
    };

    const entities = await Entity.find(filter).toArray();
    debug(entities);
    return await Promise.all(
      entities.map(
        async (entity) => await solveEntity(entity, { attrs, options })
      )
    );
  }

  static async telemetryOne({ id, type, query, data, timestamp }) {
    if (id && !ObjectId.isValid(id)) throw new Error("invalid id");
    //
    let notifyObject = { timestamp: timestamp || new Date(), data: {} };
    //
    let setObject = {};
    for (const [attr, attributeData] of Object.entries(data)) {
      setObject[attr + ".value"] = attributeData;
      setObject[attr + ".type"] = "Property";
      //
      notifyObject.data[attr] = attributeData;
      //
    }
    let queryObject = makeQueryObject(query);
    let filter = {
      ...(id && { _id: ObjectId(id) }),
      ...(type && { type }),
      ...queryObject,
    };
    let result = await Entity.findOneAndUpdate(filter, { $set: setObject });
    if (!result.ok) throw new Error("mongodb");
    if (!result.value) throw new Error("id not found");
    redisClient.publish(
      "context-broker." + result.value._id.toString(),
      JSON.stringify(notifyObject)
    );
    return true;
  }

  static async updateById({ id, data }) {
    if (!id || !ObjectId.isValid(id)) throw new Error("no id or invalid id");
    let setObject = makeSetObject(data);
    let result = await Entity.findOneAndUpdate(
      { _id: ObjectId(id) },
      { $set: setObject }
    );
    if (!result.ok) throw new Error("mongodb error");
    if (!result.value) throw new Error("not found");
  }

  static async deleteById({ id }) {
    if (!id || !ObjectId.isValid(id)) throw new Error("no id or invalid id");
    let filter = { _id: ObjectId(id) };
    await Entity.deleteOne(filter);
  }

  static async deleteMany({ ids, type, query }) {
    let queryObject = makeQueryObject(query);
    let filter = {
      ...(ids && { _id: { $in: solveList(ids).map((id) => ObjectId(id)) } }),
      ...(type && { type: { $in: solveList(type) } }),
      ...queryObject,
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
  const attributeData = entity[attr];

  if (attributeData) {
    if (!options) return attributeData;
    else if (options === "keyValue") {
      const type = attributeData.type;
      const target = attributeData.target;
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
        return attributeData.value;
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
  const attributeData = entity[attr];

  if (attributeData) {
    const type = attributeData.type;
    const target = attributeData.target;

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

function makeNewEntityObject(entity) {
  const { type, ...attributes } = entity;
  if (!isValidString(type)) throw new Error("type");

  let newEntity = { type };

  for (const [attr, attributeData] of Object.entries(attributes)) {
    if (
      Array.isArray(attributeData) ||
      typeof attributeData === "number" ||
      typeof attributeData === "boolean" ||
      typeof attributeData === "string"
    ) {
      newEntity[attr] = { type: "Property", value: attributeData };
    } else if (isValidObject(attributeData)) {
      const { type, target, value, ...metadata } = attributeData;

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

function makeQueryObject(query) {
  let _query = {};
  if (query) {
    let __query = typeof query === "string" ? JSON.parse(query) : query;
    for (const [key, value] of Object.entries(__query)) {
      _query[key + ".value"] = value;
    }
  }
  return _query;
}

function makeSetObject(entityData) {
  let setObject = {};
  for (const [attributeName, attributeData] of Object.entries(entityData)) {
    if (isValidObject(attributeData)) {
      const { type, target, value, ...metaData } = attributeData;

      if (type === "Alias" && isValidString(target?.attr)) {
        setObject[attributeName + ".type"] = "Alias";
        setObject[attributeName + ".target"] = { attr: target.attr };
        for (const key in metaData) {
          setObject[attributeName + "." + key] = metaData[key];
        }
      } else if (
        type === "Link" &&
        isValidString(target?.attr) &&
        isValidString(target?.id)
      ) {
        setObject[attributeName + ".type"] = "Link";
        setObject[attributeName + ".target"] = {
          id: target.id,
          attr: target.attr,
        };
        for (const key in metaData) {
          setObject[attributeName + "." + key] = metaData[key];
        }
      } else if (type === "Property") {
        setObject[attributeName + ".type"] = "Property";
        if (value) setObject[attributeName + ".value"] = value;
        for (const key in metaData) {
          setObject[attributeName + "." + key] = metaData[key];
        }
      } else {
        throw new Error("wrong type attribute");
      }
    } else {
      throw new Error("attribute must be an object");
    }
  }
  return setObject;
}

module.exports = EntityDAO;
