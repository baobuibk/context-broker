require("dotenv").config();
const { MongoClient } = require("mongodb");
const DB_URI = process.env.DB_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME;
const EntityDAO = require("../src/api/entity.DAO");
const redisClient = require("../src/redis");

let client;
let db;

beforeAll(async () => {
  client = await MongoClient.connect(DB_URI);
  db = client.db(DB_NAME);
  await EntityDAO.init(db);
});

afterAll(async () => {
  await redisClient.quit();
  await client.close();
});

test("can add an entity at root", async () => {
  const newEntity = {
    type: "Site",
    capacity: 50000,
  };

  await EntityDAO.addOne(newEntity);

  expect(true).toBeTruthy();
});
