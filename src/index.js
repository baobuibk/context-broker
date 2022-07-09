const PORT = process.env.PORT || 8000;
const dbUri = process.env.DB_URI || "mongodb://localhost:27017";
const dbName = process.env.DB_NAME || "context-broker";
const dbTimeout = Number(process.env.DB_TIMEOUT_MS) || 10000;

const httpServer = require("http").createServer(require("./app"));

async function main() {
  await require("./db")(dbUri, dbName, dbTimeout);
  console.log("mongodb connect");

  httpServer.listen(PORT, () =>
    console.log("server is listening on port", PORT)
  );
}

main().catch((error) => {
  console.log(error.message);
  process.exit(1);
});
