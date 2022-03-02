const { MongoClient } = require("mongodb");

describe("MongoClient.connect static method", () => {
  test("callback works", (done) => {
    async function callback(err, client) {
      if (err) done(error);
      await client.close();
      done();
    }
    MongoClient.connect(
      global.__MONGO_URI__,
      { useNewUrlParser: true, useUnifiedTopology: true },
      callback
    );
  });

  test("promise works", () => {
    return MongoClient.connect(global.__MONGO_URI__, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
      .then((client) => {
        expect(client instanceof MongoClient).toBeTruthy();
        expect(client.isConnected()).toBeTruthy();
        return client;
      })
      .then((client) => {
        client.close();
        return client;
      })
      .then((client) => {
        expect(client.isConnected()).toBeFalsy();
      });
  });

  test("async/await works", async () => {
    const client = await MongoClient.connect(global.__MONGO_URI__, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    expect(client instanceof MongoClient).toBeTruthy();
    await client.close();
  });
});

describe("MongoClient instance", () => {
  test("callback works", (done) => {
    const mongoClient = new MongoClient(global.__MONGO_URI__, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    async function callback(err, client) {
      if (err) done(error);
      await client.close();
      done();
    }
    mongoClient.connect(callback);
  });

  test("promise works", () => {
    const mongoClient = new MongoClient(global.__MONGO_URI__, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    return mongoClient
      .connect()
      .then((client) => {
        expect(client).toBe(mongoClient);
        expect(client.isConnected()).toBeTruthy();
        return client;
      })
      .then((client) => {
        client.close();
        return client;
      })
      .then((client) => {
        expect(client.isConnected()).toBeFalsy();
      });
  });

  test("async/await works", async () => {
    const mongoClient = new MongoClient(global.__MONGO_URI__, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const client = await mongoClient.connect();
    expect(client).toBe(mongoClient);
    await client.close();
  });
});
