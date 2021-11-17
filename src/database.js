const { MongoClient } = require("mongodb");

const EntityDAO = require("./api/entity.DAO");

let mongoClient;
let db;

const database = {
  connect: async (dbUri) => {
    if (!mongoClient) {
      mongoClient = new MongoClient(dbUri, { serverSelectionTimeoutMS: 10000 });

      await mongoClient.connect();
      console.log("mongodb client connect");
    }
  },

  init: async () => {
    if (!db) {
      db = mongoClient.db("context-broker");

      await EntityDAO.init(db);
      console.log("mongodb database init");
    }
  },
};

module.exports = database;
