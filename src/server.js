const express = require("express");
const cors = require("cors");

const entityRoute = require("./routes/entity.route");
const telemetryRoute = require("./routes/telemetry.route");
const provisionRoute = require("./routes/provision.route");

const app = express();

// app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/entity", entityRoute);
app.use("/telemetry", telemetryRoute);
app.use("/provision", provisionRoute);

app.use("/", express.static("build"));
app.use("*", (req, res) => res.status(404).json({ error: "not found" }));

module.exports = app;
