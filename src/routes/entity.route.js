const express = require("express");
const router = express.Router();

const EntityDAO = require("../DAOs/entity.DAO");
// const debug = require("debug")("entity.route");
const debug = console.log;

router.post("/", async (req, res) => {
  const entityData = req.body;

  console.log(entityData);
  try {
    result = await EntityDAO.insertOne(entityData);
    return res.json(result);
  } catch (error) {
    debug(error.message);
    return res.sendStatus(400);
  }
});

const isValidString = (string) => typeof string === "string" && string.length;
const makeFields = (fields) =>
  isValidString(fields)
    ? fields.split(",")
    : Array.isArray(fields) && fields.every(isValidString)
    ? fields
    : [];
function makeObject(object) {
  let _object = {};
  try {
    if (object) _object = JSON.parse(object);
  } catch (error) {
    console.log(error.message);
  }
  return _object;
}

router.get("/", async (req, res) => {
  let _query = makeObject(req.query.query);
  let _fields = makeFields(req.query.fields);
  let _options = makeObject(req.query.options);

  try {
    let result = await EntityDAO.find(_query, _fields, _options);
    return res.json(result);
  } catch (error) {
    debug(error.message);
    return res.sendStatus(500);
  }
});

router.get("/:entityId", async (req, res) => {
  const { entityId } = req.params;
  let _fields = makeFields(req.query.fields);
  let _options = makeObject(req.query.options);

  try {
    let result = await EntityDAO.findById(entityId, _fields, _options);
    return res.json(result);
  } catch (error) {
    debug(error);
    return res.status(500).send(error.message);
  }
});

router.patch("/:entityId", async (req, res) => {
  const { entityId } = req.params;
  const updates = req.body;

  try {
    await EntityDAO.updateById(entityId, updates);
    return res.sendStatus(200);
  } catch (error) {
    debug(error.message);
    return res.sendStatus(500);
  }
});

router.delete("/:entityId", async (req, res) => {
  const { entityId } = req.params;

  try {
    await EntityDAO.deleteById(entityId);
    return res.sendStatus(200);
  } catch (error) {
    debug(error.message);
    return res.sendStatus(500);
  }
});

module.exports = router;
