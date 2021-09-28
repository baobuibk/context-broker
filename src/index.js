const DB_URL = process.env.DB_URL;
const DB_NAME = process.env.DB_NAME;
const Database = require("./database");

const PORT = process.env.PORT || 3000;
const server = require("./server");

async function main() {
  await Database.connect(DB_URL);
  await Database.init(DB_NAME);

  server.listen(PORT, () => {
    console.log("server is listening on port", PORT);
  });
}

main().catch(async (error) => {
  console.log(error);
  await Database.close();
  process.exit(1);
});
