const express = require("express");
const app = express();

const cors = require("cors");
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const morganLogger = require("morgan");
app.use(morganLogger("dev"));

const entityRoute = require("./api/entity.route");
app.use("/api/entity", entityRoute);
app.use("/api/entities", entityRoute);

app.get("/status", (req, res) => res.sendStatus(200));
app.use("*", (req, res) => res.sendStatus(404));

module.exports = app;
