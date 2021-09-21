const DB_URL = process.env.DB_URL;
const DB_NAME = process.env.DB_NAME;
const MongoDB = require("./database");

const PORT = process.env.PORT || 3000;
const expressServer = require("./server");

async function main() {
  await MongoDB.connect(DB_URL);
  await MongoDB.init(DB_NAME);

  expressServer.listen(PORT, () => {
    console.log("server is listening on port", PORT);
  });
}

main().catch(async (error) => {
  console.log(error);
  await MongoDB.close();
  process.exit(1);
});
