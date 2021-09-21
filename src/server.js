const express = require("express");
const cors = require("cors");
const morganLogger = require("morgan");
const entityRoute = require("./routes/entity.route");
const ruleRoute = require("./routes/rule.route");
const telemetryRoute = require("./routes/telemetry.route");
const provisionRoute = require("./routes/provision.route");

const app = express();

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(morganLogger("dev"));

app.use("/entity", entityRoute);
app.use("/entities", entityRoute);
app.use("/rules", ruleRoute);
app.use("/telemetry", telemetryRoute);
app.use("/provision", provisionRoute);

app.get("/check", (req, res) => res.send("ok"));

// app.use("/", express.static("build"));
app.use("*", (req, res) => res.status(404).json({ error: "not found" }));

module.exports = app;
