const axios = require("axios");

const EntityDAO = require("../src/api/entity.DAO");
const RecordDAO = require("../src/api/record.DAO");

beforeAll(async () => {
  await RecordDAO.addSchema(global.db);
  await RecordDAO.inject(global.db);
  await EntityDAO.addSchema(global.db);
  await EntityDAO.inject(global.db);
});

test("get entity records many month", async () => {
  const { data } = await axios.get("http://localhost:3002/entity/get/records", {
    params: {
      id: "60e0b30a66f6835858162f5b",
      attrs: "voltage",
      year: "2021",
      month: "7",
    },
  });
  console.log(data.data.voltage);
  expect(true).toBeTruthy();
});
