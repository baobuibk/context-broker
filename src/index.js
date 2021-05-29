const app = require("./server");
const MongoClient = require("mongodb").MongoClient;

const EntityDAO = require("./daos/entity.DAO");
const RecordDAO = require("./daos/record.DAO");

const DB_URI = process.env.DB_URI;
const client = new MongoClient(DB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const DB_NAME = process.env.DB_NAME;
client
  .connect()
  .then(async () => {
    console.log("connected to mongodb");

    const db = client.db(DB_NAME);

    await EntityDAO.addSchema(db);
    EntityDAO.inject(db);
    await RecordDAO.addSchema(db);
    RecordDAO.inject(db);

    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`server is listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
