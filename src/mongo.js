const { MongoClient } = require("mongodb");

const EntityDAO = require("./api/entity.DAO");
const CommandDAO = require("./api/command.DAO");

let mongoClient;
let db;

const mongo = {
  connect: async (dbUri, dbName) => {
    if (!mongoClient && !db) {
      mongoClient = new MongoClient(dbUri, { serverSelectionTimeoutMS: 10000 });
      await mongoClient.connect();
      console.log("mongodb client connect");

      db = mongoClient.db(dbName);
      await EntityDAO.init(db);
      console.log("initialized EntityDAO");
      await CommandDAO.init(db);
      console.log("initilized CommandDAO");
    }
  },
};

module.exports = mongo;
