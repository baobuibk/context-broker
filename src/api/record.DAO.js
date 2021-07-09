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
    const time = new Date(sample.t).getTime();
    const roundToHour = new Date(time - (time % 3600000));

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
    const { entity, attr, from, to, interval, filter } = props;

    // month level
    if (typeof year !== "string") throw new Error("year must be string");

    const matchDate = Array.isArray(month)
      ? {
          $gte: new Date(year, month[0] - 1),
          $lt: new Date(year, month[1]),
        }
      : {
          $gte: new Date(year, month - 1),
          $lt: new Date(year, month),
        };

    const manyMonths = await Record.aggregate([
      {
        $match: {
          entity: ObjectId(entity),
          attr,
          date: matchDate,
        },
      },
      { $unwind: "$samples" },
      { $sort: { "samples.t": 1 } },
      {
        $project: {
          _id: 0,
          sample: "$samples",
          month: { $month: "$samples.t" },
        },
      },
      {
        $group: {
          _id: "$month",
          ...(filter === "first" && { data: { $first: "$sample" } }),
          ...(filter === "last" && { data: { $last: "$sample" } }),
          ...(filter === "avg" && { data: { $avg: "$sample.v" } }),
          ...(filter === "count" && { data: { $sum: 1 } }),
          ...((!filter || filter === "all") && { data: { $push: "$sample" } }),
        },
      },
    ]).toArray();
    let result = {};
    for (const oneMonth of manyMonths) {
      result[oneMonth._id] = oneMonth.data;
    }
    return result;

    return;

    if (!entity || !attr || !year || !month)
      throw new Error("need entity, attr, year, month");

    // quarter level
    if (quarter) {
      if (!hour || !day || !month || !year)
        throw new Error("need hour, date, month, year for quarter");
      if (
        typeof hour !== "string" ||
        typeof day !== "string" ||
        typeof month !== "string" ||
        typeof year !== "string"
      )
        throw new Error("hour,date, month, year must be string");

      const matchDate = new Date(year, month - 1, day, hour);

      const manyQuarters = await Record.aggregate([
        { $match: { entity: ObjectId(entity), attr, date: matchDate } },
        { $unwind: "$samples" },
        { $sort: { "samples.t": 1 } },
        {
          $project: {
            _id: 0,
            sample: "$samples",
            quarter: {
              $sum: [
                { $multiply: [{ $minute: "$samples.t" }, 4] },
                { $floor: { $divide: [{ $second: "$samples.t" }, 15] } },
              ],
            },
          },
        },
        {
          $group: {
            _id: "$quarter",
            ...(filter === "first" && { data: { $first: "$sample" } }),
            ...(filter === "last" && { data: { $last: "$sample" } }),
            ...(filter === "avg" && { data: { $avg: "$sample.v" } }),
            ...(filter === "count" && { data: { $sum: 1 } }),
            ...((!filter || filter === "all") && {
              data: { $push: "$sample" },
            }),
          },
        },
      ]).toArray();
      let result = {};
      for (const oneQuarter of manyQuarters) {
        result[oneQuarter._id] = oneQuarter.data;
      }
      return result;
    }

    // half level
    if (half) {
      if (!hour || !day || !month || !year)
        throw new Error("need hour, date, month, year for half");
      if (
        typeof hour !== "string" ||
        typeof day !== "string" ||
        typeof month !== "string" ||
        typeof year !== "string"
      )
        throw new Error("hour,date, month, year must be string");

      const matchDate = new Date(year, month - 1, day, hour);

      const manyHalfs = await Record.aggregate([
        { $match: { entity: ObjectId(entity), attr, date: matchDate } },
        { $unwind: "$samples" },
        { $sort: { "samples.t": 1 } },
        {
          $project: {
            _id: 0,
            sample: "$samples",
            half: {
              $sum: [
                { $multiply: [{ $minute: "$samples.t" }, 2] },
                { $floor: { $divide: [{ $second: "$samples.t" }, 30] } },
              ],
            },
          },
        },
        {
          $group: {
            _id: "$half",
            ...(filter === "first" && { data: { $first: "$sample" } }),
            ...(filter === "last" && { data: { $last: "$sample" } }),
            ...(filter === "avg" && { data: { $avg: "$sample.v" } }),
            ...(filter === "count" && { data: { $sum: 1 } }),
            ...((!filter || filter === "all") && {
              data: { $push: "$sample" },
            }),
          },
        },
      ]).toArray();
      let result = {};
      for (const oneHalf of manyHalfs) {
        result[oneHalf._id] = oneHalf.data;
      }
      return result;
    }

    // minute level
    if (minute) {
      if (!hour || !day || !month || !year)
        throw new Error("need hour, date, month, year for minute");
      if (
        typeof hour !== "string" ||
        typeof day !== "string" ||
        typeof month !== "string" ||
        typeof year !== "string"
      )
        throw new Error("hour,date, month, year must be string");

      const matchDate = new Date(year, month - 1, day, hour);

      const manyMinutes = await Record.aggregate([
        { $match: { entity: ObjectId(entity), attr, date: matchDate } },
        { $unwind: "$samples" },
        { $sort: { "samples.t": 1 } },
        {
          $project: {
            _id: 0,
            sample: "$samples",
            minute: { $minute: "$samples.t" },
          },
        },
        {
          $group: {
            _id: "$minute",
            ...(filter === "first" && { data: { $first: "$sample" } }),
            ...(filter === "last" && { data: { $last: "$sample" } }),
            ...(filter === "avg" && { data: { $avg: "$sample.v" } }),
            ...(filter === "count" && { data: { $sum: 1 } }),
            ...((!filter || filter === "all") && {
              data: { $push: "$sample" },
            }),
          },
        },
      ]).toArray();
      let result = {};
      for (const oneMinute of manyMinutes) {
        result[oneMinute._id] = oneMinute.data;
      }
      return result;
    }

    // hour level
    if (hour) {
      if (!day || !month || !year)
        throw new Error("need date, month, year for hour");
      if (
        typeof day !== "string" ||
        typeof month !== "string" ||
        typeof year !== "string"
      )
        throw new Error("date, month, year must be string");

      const matchDate = Array.isArray(hour)
        ? {
            $gte: new Date(year, month - 1, day, hour[0]),
            $lte: new Date(year, month - 1, day, hour[1]),
          }
        : new Date(year, month - 1, day, hour);

      const manyHours = await Record.aggregate([
        { $match: { entity: ObjectId(entity), attr, date: matchDate } },
        { $unwind: "$samples" },
        { $sort: { "samples.t": 1 } },
        {
          $project: {
            _id: 0,
            sample: "$samples",
            hour: { $hour: "$samples.t" },
          },
        },
        {
          $group: {
            _id: "$hour",
            ...(filter === "first" && { data: { $first: "$sample" } }),
            ...(filter === "last" && { data: { $last: "$sample" } }),
            ...(filter === "avg" && { data: { $avg: "$sample.v" } }),
            ...(filter === "count" && { data: { $sum: 1 } }),
            ...((!filter || filter === "all") && {
              data: { $push: "$sample" },
            }),
          },
        },
      ]).toArray();
      let result = {};
      for (const oneHour of manyHours) {
        result[oneHour._id] = oneHour.data;
      }
      return result;
    }

    // day level
    if (day) {
      if (!month || !year) throw new Error("need month, year for day");
      if (typeof month !== "string" || typeof year !== "string")
        throw new Error("month, year must be string");

      const matchDate = Array.isArray(day)
        ? {
            $gte: new Date(year, month - 1, day[0]),
            $lt: new Date(year, month - 1, parseInt(day[1]) + 1),
          }
        : {
            $gte: new Date(year, month - 1, day),
            $lt: new Date(year, month - 1, parseInt(day) + 1),
          };

      const manyDays = await Record.aggregate([
        {
          $match: {
            entity: ObjectId(entity),
            attr,
            date: matchDate,
          },
        },
        { $unwind: "$samples" },
        { $sort: { "samples.t": 1 } },
        {
          $project: {
            _id: 0,
            sample: "$samples",
            day: { $dayOfMonth: "$samples.t" },
          },
        },
        {
          $group: {
            _id: "$day",
            ...(filter === "first" && { data: { $first: "$sample" } }),
            ...(filter === "last" && { data: { $last: "$sample" } }),
            ...(filter === "avg" && { data: { $avg: "$sample.v" } }),
            ...(filter === "count" && { data: { $sum: 1 } }),
            ...((!filter || filter === "all") && {
              data: { $push: "$sample" },
            }),
          },
        },
      ]).toArray();
      let result = {};
      for (const oneDay of manyDays) {
        result[oneDay._id] = oneDay.data;
      }
      return result;
    }
  }
}
module.exports = recordsDAO;
