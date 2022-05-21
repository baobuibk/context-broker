const { MongoClient } = require("mongodb");

const EntityDAO = require("./DAOs/entity.DAO");
const CommandDAO = require("./DAOs/command.DAO");

let db;

module.exports = async (dbUri, dbName, timeout) => {
  if (!db) {
    let client = new MongoClient(dbUri, { serverSelectionTimeoutMS: timeout });
    await client.connect();
    db = client.db(dbName);
    await EntityDAO.init(db);
    await CommandDAO.init(db);
  }
};
