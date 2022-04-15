const http = require("http");

require("./redis");

const mongo = require("./mongo");
const expressApp = require("./express");

const DB_URI = process.env.DB_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "context-broker";
const PORT = process.env.PORT || 8000;

const httpServer = http.createServer(expressApp);

/** Main entry of this code */
async function main() {
  await mongo.connect(DB_URI, DB_NAME);

  httpServer.listen(PORT, () => {
    console.log("http server is listening on port", PORT);
  });
}

main().catch((error) => {
  console.log(error.message);
  process.exit(1);
});
