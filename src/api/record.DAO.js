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
    let { entity, attr, date, from, to, interval, filter } = props;

    // date
    if (date) {
      var matchDate =
        time.length === 1
          ? {
              $gte: new Date(time[0], 0),
              $lt: new Date(time[0], 12),
            }
          : time.length === 2
          ? {
              $gte: new Date(time[0], time[1] - 1),
              $lt: new Date(time[0], time[1]),
            }
          : time.length === 3
          ? {
              $gte: new Date(time[0], time[1] - 1, time[2]),
              $lt: new Date(time[0], time[1] - 1, time[2] + 1),
            }
          : time.length === 4
          ? {
              $gte: new Date(time[0], time[1] - 1, time[2], time[3]),
              $lt: new Date(time[0], time[1] - 1, time[2], time[3] + 1),
            }
          : new Date();

      // from and to
    } else if (from && to) {
      const lowBound =
        time.length === 1
          ? new Date(time[0], 0)
          : time.length === 2
          ? new Date(time[0], time[1] - 1)
          : time.length === 3
          ? new Date(time[0], time[1] - 1, time[2])
          : time.length === 4
          ? new Date(time[0], time[1] - 1, time[2], time[3])
          : new Date();

      const highBound =
        time.length === 1
          ? new Date(time[0], 12)
          : time.length === 2
          ? new Date(time[0], time[1])
          : time.length === 3
          ? new Date(time[0], time[1] - 1, time[2] + 1)
          : time.length === 4
          ? new Date(time[0], time[1] - 1, time[2], time[3] + 1)
          : new Date();

      var matchDate = {
        $gte: lowBound,
        $lt: highBound,
      };

      // from and no to
    } else if (from && !to) {
      return;
    }

    // no from and to
    if (!from && to) {
      return;
    }

    // no from and no to
    if (!from && !to) {
      return;
    }

    const groupObj = {};
    if (filter)
      for (const e of filter) {
        groupObj[e] = filterObj[e];
      }
    else {
      groupObj["avg"] = filterObj["avg"];
      groupObj["count"] = filterObj["count"];
    }

    const records = await Record.aggregate([
      { $match: { entity: ObjectId(entity), attr, date: matchDate } },
      { $unwind: "$samples" },
      { $project: { _id: 0, sample: "$samples", t: "$samples.t" } },
      ...((filter === "first" || filter === "last") && {
        $sort: { $t: 1 },
      }),
      {
        $project: {
          sample: 1,
          time: interval ? intervalObj[interval] : intervalObj["hour"],
        },
      },
      {
        $group: { _id: "$time", ...groupObj },
      },
      {
        $project: {
          _id: 0,
          time: "$_id",
          data: 1,
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
  date: { $dateToString: { date: "$t" } },
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
