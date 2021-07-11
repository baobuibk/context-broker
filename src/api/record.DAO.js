const ObjectId = require("mongodb").ObjectId;

const Schema = require("../schemas/record.schema");

let Record;
const collName = "records";

class recordsDAO {
  static async addSchema(db) {
    const collList = await db
      .listCollections({ name: collName }, { nameOnly: true })
      .toArray();

    if (collList.length) {
      await db.command({ collMod: collName, validator: Schema });
      // console.log(`modified ${collName} schema`);
    } else {
      await db.createCollection(collName, { validator: Schema });
      // console.log(`created ${collName} schema`);
    }
  }

  static inject(db) {
    if (!Record) Record = db.collection(collName);
  }

  // Add one sample
  static async addOneSample(entity, attr, sample) {
    const millis = new Date(sample.t).getTime();
    const roundToHour = new Date(millis - (millis % 3600000));

    const filter = {
      entity: ObjectId(entity),
      attr,
      date: roundToHour,
      count: { $lt: 10 },
    };
    const update = {
      $push: { samples: { $each: [sample], $sort: { t: 1 } } },
      $inc: { count: 1 },
    };
    const options = { upsert: true };
    const { result } = await Record.updateOne(filter, update, options);
    return { ok: result.ok, status: result.upserted ? "upserted" : "modified" };
  }

  static async get(props) {
    const { entity, attr, date, from, to, interval, filter } = props;

    let matchDate;

    // date
    if (date) {
      const gte = [date[0], 0];
      const lt = [date[0], 12];

      if (date[1]) {
        gte[1] = date[1] - 1;
        lt[1] = date[1];
      }

      if (date[2]) {
        gte[2] = date[2];
        lt[2] = date[2] + 1;
      }

      if (date[3]) {
        gte[3] = date[3];
        lt[3] = date[3] + 1;
      }

      matchDate = { $gte: new Date(...gte), $lt: new Date(...lt) };

      // from and to
    } else if (from && to) {
      const gte = [from[0], 0];
      if (from[1]) gte[1] = from[1] - 1;
      if (from[2]) gte[2] = from[2];
      if (from[3]) gte[3] = from[3];

      const lt = [to[0], 12];
      if (to[1]) lt[1] = to[1];
      if (to[2]) lt[2] = to[2] + 1;
      if (to[3]) lt[3] = to[3] + 1;

      matchDate = { $gte: new Date(...gte), $lt: new Date(...lt) };

      // from and no to
    } else if (from && !to) {
      const gte = [from[0], 0];
      if (from[1]) gte[1] = from[1] - 1;
      if (from[2]) gte[2] = from[2];
      if (from[3]) gte[3] = from[3];

      matchDate = { $gte: new Date(...gte) };

      // no from and to
    } else if (!from && to) {
      const lt = [to[0], 12];
      if (to[1]) lt[1] = to[1];
      if (to[2]) lt[2] = to[2] + 1;
      if (to[3]) lt[3] = to[3] + 1;

      matchDate = { $lt: new Date(...lt) };

      // no from and no to
    } else if (!from && !to) {
      const now = new Date().getTime();

      matchDate = { $gte: new Date(now - (now % 86400000)) };

      // should never get here
    } else throw new Error("somethings wrong with date, from, to");

    const groupObj = {};
    const projectObj = {};
    if (filter)
      for (const e of filter) {
        groupObj[e] = filterObj[e];
        projectObj[e] = 1;
      }
    else {
      groupObj["count"] = filterObj["count"];
      projectObj["count"] = 1;
    }

    const records = await Record.aggregate([
      { $match: { entity: ObjectId(entity), attr, date: matchDate } },
      { $unwind: "$samples" },
      { $project: { _id: 0, sample: "$samples", t: "$samples.t" } },
      { $sort: { t: 1 } },
      {
        $project: {
          sample: 1,
          time: interval ? intervalObj[interval] : intervalObj["day"],
        },
      },
      {
        $group: { _id: "$time", ...groupObj },
      },
      {
        $project: {
          _id: 0,
          time: "$_id",
          ...projectObj,
        },
      },
    ]).toArray();
    return records;
  }
}
module.exports = recordsDAO;

const filterObj = {
  all: { $push: "$sample" },
  avg: { $avg: "$sample.v" },
  count: { $sum: 1 },
  first: { $first: "$sample" },
  last: { $last: "$sample" },
  max: { $max: "$sample" },
  min: { $min: "$sample" },
};
// 2021-07-01T00:15:00.000Z
const intervalObj = {
  date: { $concat: [{ $dateToString: { date: "$t" } }] },
  year: { $dateToString: { date: "$t", format: "%Y" } },
  month: { $dateToString: { date: "$t", format: "%Y-%m" } },
  day: { $dateToString: { date: "$t", format: "%Y-%m-%d" } },
  hour: { $dateToString: { date: "$t", format: "%Y-%m-%dT%H" } },
  "30m": {
    $concat: [
      { $dateToString: { date: "$t", format: "%Y-%m-%dT%H:" } },
      {
        $cond: [
          { $eq: [{ $floor: { $divide: [{ $minute: "$t" }, 30] } }, 0] },
          "00",
          {
            $toString: {
              $multiply: [{ $floor: { $divide: [{ $minute: "$t" }, 30] } }, 30],
            },
          },
        ],
      },
    ],
  },
  "15m": {
    $concat: [
      { $dateToString: { date: "$t", format: "%Y-%m-%dT%H:" } },
      {
        $cond: [
          { $eq: [{ $floor: { $divide: [{ $minute: "$t" }, 15] } }, 0] },
          "00",
          {
            $toString: {
              $multiply: [{ $floor: { $divide: [{ $minute: "$t" }, 15] } }, 15],
            },
          },
        ],
      },
    ],
  },
  minute: { $dateToString: { date: "$t", format: "%Y-%m-%dT%H:%M" } },
  "30s": {
    $concat: [
      { $dateToString: { date: "$t", format: "%Y-%m-%dT%H:%M:" } },
      {
        $cond: [
          { $eq: [{ $floor: { $divide: [{ $second: "$t" }, 30] } }, 0] },
          "00",
          {
            $toString: {
              $multiply: [{ $floor: { $divide: [{ $second: "$t" }, 30] } }, 30],
            },
          },
        ],
      },
    ],
  },
  "15s": {
    $concat: [
      { $dateToString: { date: "$t", format: "%Y-%m-%dT%H:%M:" } },
      {
        $cond: [
          { $eq: [{ $floor: { $divide: [{ $second: "$t" }, 15] } }, 0] },
          "00",
          {
            $toString: {
              $multiply: [{ $floor: { $divide: [{ $second: "$t" }, 15] } }, 15],
            },
          },
        ],
      },
    ],
  },
  second: { $dateToString: { date: "$t", format: "%Y-%m-%dT%H:%M:%S" } },
};
