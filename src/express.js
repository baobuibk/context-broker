const express = require("express");
const app = express();

const cors = require("cors");
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const morganLogger = require("morgan");
app.use(morganLogger("dev"));

app.use("/api/entity", require("./api/entity.route"));
app.use("/api/entities", require("./api/entity.route"));
app.use("/api/provision", require("./api/provision.route"));
app.use("/api/telemetry", require("./api/telemetry.route"));
app.use("/api/command", require("./api/command.route"));

app.get("/status", (req, res) => res.sendStatus(200));
app.use("*", (req, res) => res.sendStatus(404));

module.exports = app;
