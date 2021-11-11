const http = require("http");

const redisClient = require("./redis");
const database = require("./database");
const expressApp = require("./expressApp");

async function main() {
  const DB_URL = process.env.DB_URL || "mongodb://localhost:27017";
  const DB_NAME = process.env.DB_NAME || "monitoring-backend";
  await database.connect(DB_URL);
  await database.init(DB_NAME);

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
