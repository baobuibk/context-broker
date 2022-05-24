const { ObjectId } = require("mongodb");
const entitySchema = require("../schemas/entity.schema");
const flatten = require("flat");

let Entity;
const collName = "entity";

class EntityDAO {
  static async init(db) {
    const collList = await db
      .listCollections({ name: collName }, { nameOnly: true })
      .toArray();

    if (!collList.length)
      await db.createCollection(collName, {
        validator: { $jsonSchema: entitySchema },
      });
    else
      await db.command({
        collMod: collName,
        validator: { $jsonSchema: entitySchema },
      });

    if (!Entity) Entity = db.collection(collName);
  }

  static async insertOne(entityData) {
    const result = await Entity.insertOne(entityData);
    if (result.acknowledged) return { ...entityData, _id: result.insertedId };
    else throw new Error("database error");
  }

  static async find(query, fields, options) {
    let _projection = {};
    fields.forEach((field) => (_projection[field] = 1));

    let _filter = {};
    for (const field in query) {
      _filter[`${field}.value`] = query[field];
    }

    const entities = await Entity.find(_filter).project(_projection).toArray();
    return entities.map((entity) => ({ ...entity, id: entity._id }));
  }

  static async findById(id, fields, options) {
    let _projection = {};
    fields.forEach((field) => (_projection[field] = 1));
    const entity = await Entity.findOne(
      { _id: ObjectId(id) },
      { projection: _projection }
    );
    return entity ? { ...entity, id: entity._id } : null;
  }

  static async updateById(entityId, updates) {
    const { id, _id, type, ..._updates } = updates;
    if (id || _id || type) throw new Error("cant change that");

    let set = flatten(_updates);
    let last = {};
    for (const key in _updates) {
      last[`${key}.lastModified`] = true;
    }
    await Entity.findOneAndUpdate(
      { _id: ObjectId(entityId) },
      { $set: set, $currentDate: last }
    );
  }

  static async deleteById(id) {
    await Entity.deleteOne({ _id: ObjectId(id) });
  }
}

module.exports = EntityDAO;
