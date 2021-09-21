const { MongoClient } = require("mongodb");

const EntityDAO = require("./DAOs/entity.DAO");
const RecordDAO = require("./DAOs/record.DAO");
const RuleDAO = require("./DAOs/rule.DAO");

let mongoClient;
let db;

class MongoDB {
  static async connect(url) {
    if (!mongoClient) {
      mongoClient = new MongoClient(url, { serverSelectionTimeoutMS: 10000 });

      await mongoClient.connect();
      console.log("connected to mongodb");
    }
  }

  static async init(DB_NAME) {
    if (!db) {
      db = mongoClient.db(DB_NAME);

      await EntityDAO.init(db);
      await RecordDAO.init(db);
      await RuleDAO.init(db);
      console.log("initialized database");
    }
  }

  static async close() {
    await mongoClient.close();
  }
}

module.exports = MongoDB;
