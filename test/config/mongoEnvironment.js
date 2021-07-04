const NodeEnvironment = require("jest-environment-node");
const { MongoClient } = require("mongodb");
const DB_URI = process.env.DB_URI;
const DB_NAME = process.env.DB_NAME;

class MongoEnvironment extends NodeEnvironment {
  async setup() {
    await super.setup();
    console.log("Setup Mongo Environment");

    this.global.client = await MongoClient.connect(DB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    this.global.db = this.global.client.db(DB_NAME);
  }

  async teardown() {
    await this.global.client.close();
    delete this.global.client;
    delete this.global.db;

    console.log("Teardown Mongo Environment");
    await super.teardown();
  }

  getVmContext() {
    return super.getVmContext();
  }
}

module.exports = MongoEnvironment;
