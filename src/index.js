require("dotenv").config();

const httpServer = require("http").createServer(require("./app"));
const PORT = process.env.PORT || 8000;

async function main() {
  await require("./db").connect(
    process.env.DB_URI || "mongodb://localhost:27017",
    process.env.DB_NAME || "context-broker"
  );

  httpServer.listen(PORT, () =>
    console.log("server is listening on port", PORT)
  );
}

main().catch((error) => {
  console.log(error.message);
  process.exit(1);
});
