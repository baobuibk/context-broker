const express = require("express");
const app = express();

const cors = require("cors");
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const morganLogger = require("morgan");
app.use(morganLogger("dev"));

const entityRouter = require("./api/entity.route");
app.use("/api/entity", entityRouter);
app.use("/api/entities", entityRouter);
app.use("/entity", entityRouter);
app.use("/entities", entityRouter);

app.use("/api/provision",  require("./api/provision.route"));
app.use("/api/command", require("./api/command.route"));

app.use("/api/test", require("./api/test.route"));

app.get("/status", (req, res) => res.sendStatus(200));
app.use("*", (req, res) => res.sendStatus(404));

module.exports = app;
