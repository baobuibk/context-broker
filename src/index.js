const app = require("./server");
const MongoClient = require("mongodb").MongoClient;

const EntityDAO = require("./daos/entity.DAO");
const RecordDAO = require("./daos/record.DAO");

const MONGODB_URI = process.env.MONGODB_URI;
const client = new MongoClient(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const DATABASE = process.env.DATABASE;
client
  .connect()
  .then(async () => {
    console.log("connected to mongodb");

    const db = client.db(DATABASE);

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
