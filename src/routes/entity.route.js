const express = require("express");
const router = express.Router();

const EntityDAO = require("../DAOs/entity.DAO");
const debug = require("debug")("entity.route");

router.post("/", async (req, res) => {
  const entityData = req.body;

  try {
    result = await EntityDAO.insertOne(entityData);
    return res.json(result);
  } catch (error) {
    debug(error.message);
    return res.sendStatus(400);
  }
});

router.get("/", async (req, res) => {
  const { attrs, ...query } = req.query;

  try {
    let result = await EntityDAO.find(query, attrs);
    return res.json(result);
  } catch (error) {
    debug(error.message);
    return res.sendStatus(500);
  }
});

router.get("/:entityId", async (req, res) => {
  const { entityId } = req.params;
  const { fields } = req.query;

  try {
    let result = await EntityDAO.findById(entityId, fields);
    return res.json(result);
  } catch (error) {
    debug(error);
    return res.sendStatus(500);
  }
});

router.patch("/:entityId", async (req, res) => {
  const { id } = req.query;

  if (!id) res.status(400).send("require id");
  const data = req.body;

  try {
    await EntityDAO.updateById({ id, data });
    return res.sendStatus(200);
  } catch (error) {
    debug(error.message);
    return res.sendStatus(500);
  }
});

router.delete("/:entityId", async (req, res) => {
  const { id, ids, type, q } = req.query;

  try {
    let result;
    if (id) result = await EntityDAO.deleteById({ id });
    else result = await EntityDAO.deleteMany({ ids, type, query });
    debug(result);
    return res.json(result);
  } catch (error) {
    debug(error.message);
    return res.sendStatus(500);
  }
});

module.exports = router;
