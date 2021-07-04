const RecordDAO = require("../src/api/record.DAO");
const { getRandomInt } = require("../src/random");

beforeAll(async () => {
  await RecordDAO.addSchema(global.db);
  await RecordDAO.inject(global.db);
});

function realMonth(m) {
  return m - 1;
}

describe("add samples", () => {
  test("add one sample", async () => {
    const result = await RecordDAO.addOneSample(
      "60e0b30a66f6835858162f5b",
      "voltage",
      {
        v: getRandomInt(198, 242),
        t: new Date(2021, realMonth(7), 3, 23, 5),
      }
    );
    console.log(result);

    expect(true).toBeTruthy();
  });

  test("add many samples", async () => {
    // 06-30T23:00
    await RecordDAO.addOneSample("60e0b30a66f6835858162f5b", "voltage", {
      v: getRandomInt(198, 242),
      t: new Date(2021, realMonth(6), 30, 23, 15),
    });
    await RecordDAO.addOneSample("60e0b30a66f6835858162f5b", "voltage", {
      v: getRandomInt(198, 242),
      t: new Date(2021, realMonth(6), 30, 23, 30),
    });
    await RecordDAO.addOneSample("60e0b30a66f6835858162f5b", "voltage", {
      v: getRandomInt(198, 242),
      t: new Date(2021, realMonth(6), 30, 23, 45),
    });

    // 07-01T00:00
    await RecordDAO.addOneSample("60e0b30a66f6835858162f5b", "voltage", {
      v: getRandomInt(198, 242),
      t: new Date(2021, realMonth(7), 1, 0, 15),
    });
    await RecordDAO.addOneSample("60e0b30a66f6835858162f5b", "voltage", {
      v: getRandomInt(198, 242),
      t: new Date(2021, realMonth(7), 1, 0, 30),
    });
    await RecordDAO.addOneSample("60e0b30a66f6835858162f5b", "voltage", {
      v: getRandomInt(198, 242),
      t: new Date(2021, realMonth(7), 1, 0, 45),
    });

    // 07-01T23:00
    await RecordDAO.addOneSample("60e0b30a66f6835858162f5b", "voltage", {
      v: getRandomInt(198, 242),
      t: new Date(2021, realMonth(7), 1, 23, 15),
    });
    await RecordDAO.addOneSample("60e0b30a66f6835858162f5b", "voltage", {
      v: getRandomInt(198, 242),
      t: new Date(2021, realMonth(7), 1, 23, 30),
    });
    await RecordDAO.addOneSample("60e0b30a66f6835858162f5b", "voltage", {
      v: getRandomInt(198, 242),
      t: new Date(2021, realMonth(7), 1, 23, 45),
    });

    // 07-02T00:00
    await RecordDAO.addOneSample("60e0b30a66f6835858162f5b", "voltage", {
      v: getRandomInt(198, 242),
      t: new Date(2021, realMonth(7), 2, 0, 15),
    });
    await RecordDAO.addOneSample("60e0b30a66f6835858162f5b", "voltage", {
      v: getRandomInt(198, 242),
      t: new Date(2021, realMonth(7), 2, 0, 30),
    });
    await RecordDAO.addOneSample("60e0b30a66f6835858162f5b", "voltage", {
      v: getRandomInt(198, 242),
      t: new Date(2021, realMonth(7), 2, 0, 45),
    });

    // 07-02T01:00
    await RecordDAO.addOneSample("60e0b30a66f6835858162f5b", "voltage", {
      v: getRandomInt(198, 242),
      t: new Date(2021, realMonth(7), 2, 1, 15),
    });
    await RecordDAO.addOneSample("60e0b30a66f6835858162f5b", "voltage", {
      v: getRandomInt(198, 242),
      t: new Date(2021, realMonth(7), 2, 1, 30),
    });
    await RecordDAO.addOneSample("60e0b30a66f6835858162f5b", "voltage", {
      v: getRandomInt(198, 242),
      t: new Date(2021, realMonth(7), 2, 1, 45),
    });

    expect(true).toBeTruthy();
  });
});

describe("get records by resolution", () => {
  test("for minute resolution", async () => {
    const result = await RecordDAO.get({
      entity: "60e0b30a66f6835858162f5b",
      attr: "voltage",
      year: "2021",
      month: "7",
      day: "2",
      hour: "0",
      minute: true,
    });

    console.log(result);
    expect(true).toBeTruthy();
  });

  test("for half resolution", async () => {
    const result = await RecordDAO.get({
      entity: "60e0b30a66f6835858162f5b",
      attr: "voltage",
      year: "2021",
      month: "7",
      day: "2",
      hour: "0",
      half: true,
      filter: "avg",
    });

    console.log(result);
    expect(true).toBeTruthy();
  });

  test("for quarter resolution", async () => {
    const result = await RecordDAO.get({
      entity: "60e0b30a66f6835858162f5b",
      attr: "voltage",
      year: "2021",
      month: "7",
      day: "2",
      hour: "0",
      quarter: true,
      filter: "first",
    });

    console.log(result);
    expect(true).toBeTruthy();
  });
});

describe("get records by hour", () => {
  test("for one hour", async () => {
    const result = await RecordDAO.get({
      entity: "60e0b30a66f6835858162f5b",
      attr: "voltage",
      year: "2021",
      month: "7",
      day: "2",
      hour: "0",
    });

    console.log(result);
    expect(true).toBeTruthy();
  });

  test("for many hours", async () => {
    const result = await RecordDAO.get({
      entity: "60e0b30a66f6835858162f5b",
      attr: "voltage",
      year: "2021",
      month: "7",
      day: "2",
      hour: ["0", "1"],
    });

    expect(result.count).toBe(6);
    expect(result.first).toEqual(new Date(2021, realMonth(7), 2, 0, 15));
    expect(result.last).toEqual(new Date(2021, realMonth(7), 2, 1, 45));
  });
});

describe("get records by date", () => {
  test("get records for one day", async () => {
    const result = await RecordDAO.get({
      entity: "60e0b30a66f6835858162f5b",
      attr: "voltage",
      year: "2021",
      month: "7",
      day: "1",
    });

    console.log(result);
    expect(true).toBeTruthy();
  });

  test("get records for many days", async () => {
    const result = await RecordDAO.get({
      entity: "60e0b30a66f6835858162f5b",
      attr: "voltage",
      year: "2021",
      month: "7",
      day: ["1", "2"],
    });

    console.log(result);
    expect(true).toBeTruthy();
  });
});

describe.only("get records by month", () => {
  test("get records for one month", async () => {
    const result = await RecordDAO.get({
      entity: "60e0b30a66f6835858162f5b",
      attr: "voltage",
      year: "2021",
      month: "6",
    });

    console.log(result);
    expect(true).toBeTruthy();
  });

  test("get records for many months", async () => {
    const result = await RecordDAO.get({
      entity: "60e0b30a66f6835858162f5b",
      attr: "voltage",
      year: "2021",
      month: ["6", "7"],
    });

    console.log(result);
    expect(true).toBeTruthy();
  });
});
