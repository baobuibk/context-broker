const http = require("http");

const redisClient = require("./redis");
const database = require("./database");
const expressApp = require("./express");

async function main() {
  const DB_URI =
    process.env.DB_URI || "mongodb://localhost:27017/context-broker";
  await database.connect(DB_URI);
  await database.init();

  const httpServer = http.createServer(expressApp);
  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log("http server is listening on port", PORT);
  });
}

main().catch((error) => {
  console.log(error);
  process.exit(1);
});
