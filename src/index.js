const { MongoClient } = require("mongodb");

const EntityDAO = require("./api/entity.DAO");
const RecordDAO = require("./api/record.DAO");

const DB_URI = process.env.DB_URI;
const DB_NAME = process.env.DB_NAME;

MongoClient.connect(DB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(async (client) => {
    console.log("connected to mongodb");

    const db = client.db(DB_NAME);
    await EntityDAO.addSchema(db);
    EntityDAO.inject(db);
    await RecordDAO.addSchema(db);
    RecordDAO.inject(db);
  })
  .then(() => {
    const port = process.env.PORT || 3000;
    const app = require("./server");
    app.listen(port, () => {
      console.log(`server is listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.log(error.message);
    process.exit(1);
  });
