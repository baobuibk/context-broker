const ObjectId = require("mongodb").ObjectId;

const Schema = require("../schemas/record.schema");

let Record;
const collName = "records";

class recordsDAO {
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
    if (!Record) Record = db.collection(collName);
  }

  // upsert
  static async upsert(entity, attr, samples) {
    const now = new Date();
    const today = new Date(now.getTime() - (now.getTime() % 86400000));

    const filter = {
      entity: ObjectId(entity),
      attr,
      count: { $lt: 10 },
      date: today,
    };
    const update = {
      $push: { samples: { $each: samples } },
      $min: { first: samples[0].t },
      $max: { last: samples[samples.length - 1].t },
      $inc: { count: samples.length },
    };
    const options = { upsert: true };
    const { result } = await Record.updateOne(filter, update, options);
    return { ok: result.ok, status: result.upserted ? "upserted" : "modified" };
  }

  static async get({ entity, attr, attrs, from, to, date }) {
    if (attrs) {
      var attrsArr = Array.isArray(attrs) ? attrs : attrs.split(",");
      var attrMatch = { $in: attrsArr };
    } else if (attr) var attrMatch = attr;
    else return [];
    try {
      if (from && to)
        var matchDate = { $gte: new Date(from), $lte: new Date(to) };
      else if (date) {
        let day = new Date(date);
        var matchDate = new Date(day.getTime() - (day.getTime() % 86400000));
      } else {
        let now = new Date();
        var matchDate = new Date(now.getTime() - (now.getTime() % 86400000));
      }

      const recordsArr = await Record.aggregate([
        {
          $match: {
            entity: ObjectId(entity),
            attr: attrMatch,
            date: matchDate,
          },
        },
        {
          $sort: {
            date: 1,
          },
        },
        { $unwind: "$samples" },
        {
          $group: {
            _id: "$attr",
            first: { $first: "$first" },
            last: { $last: "$last" },
            count: { $sum: 1 },
            records: { $push: "$samples" },
          },
        },
        {
          $project: {
            _id: 0,
          },
        },
      ]).toArray();

      if (recordsArr.length) return recordsArr[0];
      else return { records: [] };
    } catch (error) {
      console.log(error);
      return [];
    }
  }
}
module.exports = recordsDAO;
