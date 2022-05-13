require("dotenv").config();
const debug = require("debug")("index");

const app = require("./app");
const httpServer = require("http").createServer(app);

async function main() {
  await require("./db").connect(
    process.env.DB_URI || "mongodb://localhost:27017",
    process.env.DB_NAME || "context-broker"
  );

  const PORT = process.env.PORT || 8000;
  httpServer.listen(PORT, () => debug("server is listening on port", PORT));
}

main().catch((error) => {
  debug(error.message);
  process.exit(1);
});
