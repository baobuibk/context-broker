const express = require("express");
const app = express();

const cors = require("cors");
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const morganLogger = require("morgan");
app.use(morganLogger("dev"));

const entityRoute = require("./routes/entity.route");
app.use("/entity", entityRoute);
app.use("/entities", entityRoute);

app.get("/check", (req, res) => res.send("ok"));

// app.use("/", express.static("build"));
app.use("*", (req, res) => res.status(404).json({ error: "not found" }));

module.exports = app;
