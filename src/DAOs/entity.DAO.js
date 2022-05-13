const { ObjectId } = require("mongodb");
const debug = require("debug")("entity.DAO");
// const redisClient = require("../redis");
const entitySchema = require("../schemas/entity.schema");
const axios = require("axios");

const Ajv = require("ajv");
const ajv = new Ajv();
const validateEntity = ajv.compile(entitySchema);

let Entity;
const collName = "entity";

class EntityDAO {
  static async init(db) {
    const collList = await db
      .listCollections({ name: collName }, { nameOnly: true })
      .toArray();
    if (collList.length)
      await db.command({
        collMod: collName,
        validator: { $jsonSchema: entitySchema },
      });
    else
      await db.createCollection(collName, {
        validator: { $jsonSchema: entitySchema },
      });
    if (!Entity) Entity = db.collection(collName);
  }

  static async insertOne(entityData) {
    const result = await Entity.insertOne(entityData);
    if (result.acknowledged) return { ...entityData, _id: result.insertedId };
    else throw new Error("database error");
  }

  static async findById(id, fields) {
    let projection = {};
    fields.split(",").forEach((field) => (projection[field] = 1));
    const entity = await Entity.findOne({ _id: ObjectId(id) }).project(
      projection
    );

    return entity;
  }

  static async find(query, attrs) {
    let _projection = {};
    if (attrs) attrs.split(",").forEach((attr) => (_projection[attr] = 1));

    const { type, ...others } = query;
    let _filter = { type };
    for (const attr in others) {
      _filter[`${attr}.value`] = others[attr];
    }

    return await Entity.find(_filter).project(_projection).toArray();
  }

  static async updateOneById({ id, data }) {
    // if (!id || !ObjectId.isValid(id)) throw new Error("no id or invalid id");
    // let setObject = makeSetObject(data);
    // let result = await Entity.findOneAndUpdate(
    //   { _id: ObjectId(id) },
    //   { $set: setObject }
    // );
    // if (!result.ok) throw new Error("mongodb error");
    // if (!result.value) throw new Error("not found");
  }

  static async deleteOneById({ id }) {
    // if (!id || !ObjectId.isValid(id)) throw new Error("no id or invalid id");
    // let filter = { _id: ObjectId(id) };
    // await Entity.deleteOne(filter);
    // return { status: "OK" };
  }
}

module.exports = EntityDAO;
