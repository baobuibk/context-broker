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

    let matchDate = {};

    // date
    if (date) {
      let gte;
      let lt;
      if (date.length === 1) {
        gte = [date[0], 1];
        lt = [date[0], 12];
      } else if (date.length === 2) {
        gte = [date[0], date[1] - 1];
        lt = [date[0], date[1]];
      } else if (date.length === 3) {
        gte = [date[0], date[1] - 1, date[2]];
        lt = [date[0], date[1] - 1, date[2] + 1];
      } else if (date.length === 4) {
        gte = [date[0], date[1] - 1, date[2], date[3]];
        lt = [date[0], date[1] - 1, date[2], date[3] + 1];
      } else {
        gte = [date[0], date[1] - 1, date[2], date[3]];
        lt = [date[0], date[1] - 1, date[2], date[3] + 1];
      }

      matchDate["$gte"] = new Date(Date.UTC(...gte));
      matchDate["$lt"] = new Date(Date.UTC(...lt));

      // from and to
    } else if (from && to) {
      let gte;
      if (from.length === 1) {
        gte = [date[0], 1];
      } else if (from.length === 2) {
        gte = [from[0], from[1] - 1];
      } else if (from.length === 3) {
        gte = [from[0], from[1] - 1, from[2]];
      } else if (from.length === 4) {
        gte = [from[0], from[1] - 1, from[2], from[3]];
      } else {
        gte = [from[0], from[1] - 1, from[2], from[3]];
      }

      let lt;
      if (to.length === 1) {
        lt = [date[0], 12];
      } else if (to.length === 2) {
        lt = [to[0], to[1]];
      } else if (to.length === 3) {
        lt = [to[0], to[1] - 1, to[2] + 1];
      } else if (to.length === 4) {
        lt = [to[0], to[1] - 1, to[2], to[3] + 1];
      } else {
        lt = [to[0], to[1] - 1, to[2], to[3] + 1];
      }

      matchDate["$gte"] = new Date(Date.UTC(...gte));
      matchDate["$lt"] = new Date(Date.UTC(...lt));

      // from and no to
    } else if (from && !to) {
      let gte;
      if (from.length === 1) {
        gte = [date[0], 1];
      } else if (from.length === 2) {
        gte = [from[0], from[1] - 1];
      } else if (from.length === 3) {
        gte = [from[0], from[1] - 1, from[2]];
      } else if (from.length === 4) {
        gte = [from[0], from[1] - 1, from[2], from[3]];
      } else {
        gte = [from[0], from[1] - 1, from[2], from[3]];
      }

      matchDate["$gte"] = new Date(Date.UTC(...gte));

      // no from and to
    } else if (!from && to) {
      let lt;
      if (to.length === 1) {
        lt = [date[0], 12];
      } else if (to.length === 2) {
        lt = [to[0], to[1]];
      } else if (to.length === 3) {
        lt = [to[0], to[1] - 1, to[2] + 1];
      } else if (to.length === 4) {
        lt = [to[0], to[1] - 1, to[2], to[3] + 1];
      } else {
        lt = [to[0], to[1] - 1, to[2], to[3] + 1];
      }

      matchDate["$lt"] = new Date(Date.UTC(...lt));

      // no from and no to
    } else if (!from && !to) {
      const today = new Date();
      matchDate["$gte"] = new Date(today - (today % 86400000));

      // should never get here
    } else throw new Error("somethings wrong with date, from, to");

    console.log(matchDate);

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
      {
        $project: {
          _id: 0,
          sample: "$samples",
          t: "$samples.t",
        },
      },
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
      { $sort: { _id: 1 } },
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

const intervalObj = {
  year: { $dateToString: { date: "$t", format: "%Y-01-01T00:00:00.000Z" } },
  month: { $dateToString: { date: "$t", format: "%Y-%m-01T00:00:00.000Z" } },
  day: { $dateToString: { date: "$t", format: "%Y-%m-%dT00:00:00.000Z" } },
  hour: {
    $dateToString: { date: "$t", format: "%Y-%m-%dT%H:00:00.000Z" },
  },
  "30m": {
    $concat: [
      {
        $dateToString: { date: "$t", format: "%Y-%m-%dT%H:" },
      },
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
      ":00.000Z",
    ],
  },
  "15m": {
    $concat: [
      {
        $dateToString: { date: "$t", format: "%Y-%m-%dT%H:" },
      },
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
      ":00.000Z",
    ],
  },
  "10m": {
    $concat: [
      {
        $dateToString: { date: "$t", format: "%Y-%m-%dT%H:" },
      },
      {
        $cond: [
          { $eq: [{ $floor: { $divide: [{ $minute: "$t" }, 10] } }, 0] },
          "00",
          {
            $toString: {
              $multiply: [{ $floor: { $divide: [{ $minute: "$t" }, 10] } }, 10],
            },
          },
        ],
      },
      ":00.000Z",
    ],
  },
  "5m": {
    $concat: [
      {
        $dateToString: { date: "$t", format: "%Y-%m-%dT%H:" },
      },
      {
        $cond: [
          { $eq: [{ $floor: { $divide: [{ $minute: "$t" }, 5] } }, 0] },
          "00",
          {
            $toString: {
              $multiply: [{ $floor: { $divide: [{ $minute: "$t" }, 5] } }, 5],
            },
          },
        ],
      },
      ":00.000Z",
    ],
  },
  minute: {
    $dateToString: {
      date: "$t",
      format: "%Y-%m-%dT%H:%M:00.000Z",
    },
  },
  "30s": {
    $concat: [
      {
        $dateToString: {
          date: "$t",
          format: "%Y-%m-%dT%H:%M:",
        },
      },
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
      ".000Z",
    ],
  },
  "15s": {
    $concat: [
      {
        $dateToString: {
          date: "$t",
          format: "%Y-%m-%dT%H:%M:",
        },
      },
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
      ".000Z",
    ],
  },
  "10s": {
    $concat: [
      {
        $dateToString: {
          date: "$t",
          format: "%Y-%m-%dT%H:%M:",
        },
      },
      {
        $cond: [
          { $eq: [{ $floor: { $divide: [{ $second: "$t" }, 10] } }, 0] },
          "00",
          {
            $toString: {
              $multiply: [{ $floor: { $divide: [{ $second: "$t" }, 10] } }, 10],
            },
          },
        ],
      },
      ".000Z",
    ],
  },
  "5s": {
    $concat: [
      {
        $dateToString: {
          date: "$t",
          format: "%Y-%m-%dT%H:%M:",
        },
      },
      {
        $cond: [
          { $eq: [{ $floor: { $divide: [{ $second: "$t" }, 5] } }, 0] },
          "00",
          {
            $toString: {
              $multiply: [{ $floor: { $divide: [{ $second: "$t" }, 5] } }, 5],
            },
          },
        ],
      },
      ".000Z",
    ],
  },
  second: {
    $dateToString: { date: "$t", format: "%Y-%m-%dT%H:%M:%S.000Z" },
  },
};
