const EntityDAO = require("../src/api/entity.DAO");

beforeAll(async () => {
  await EntityDAO.addSchema(global.db);
  await EntityDAO.inject(global.db);
});

test("can add an entity at root", async () => {
  const newEntity = {
    data: {
      kind: "Gateway",
      name: "Gateway 1",
      voltage: 232,
    },
    record: {
      voltage: true,
      name: false,
    },
    alias: {
      Voltage: "voltage",
    },
  };

  const result = await EntityDAO.add(newEntity);
  console.log(result);
  expect(true).toBeTruthy();
});

test("can upsert an entity", async () => {
  const upsertObj = {
    data: {
      kind: "Gateway",
      name: "Gateway 1",
      voltage: 235,
    },
    record: {
      voltage: true,
      name: false,
    },
    alias: {
      Voltage: "voltage",
    },
    queries: {
      kind: "Gateway",
      name: "Gateway 1",
    },
  };

  const result = await EntityDAO.upsertOne(upsertObj);
  console.log(result);
  expect(true).toBeTruthy();
});

test("get entity by id", async () => {
  const result = await EntityDAO.getById("60e02123fe3c530cf8371446");
  console.log(result);
  expect(typeof result).toBe("object");
});

test("get entity by id and attrs", async () => {
  const result = await EntityDAO.getById(
    "60e02123fe3c530cf8371446",
    "voltage,Voltage"
  );
  console.log(result);
  expect(typeof result).toBe("object");
});

test.only("get many entitties by ids", async () => {
  const result = await EntityDAO.getMany({
    ids: "60e02123fe3c530cf8371446",
    attrs: "Voltage",
  });
  console.log(result);
  expect(Array.isArray(result)).toBeTruthy();
});
