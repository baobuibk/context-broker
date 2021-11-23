const express = require("express");
const router = express.Router();

const EntityController = require("./entity.controller");

// create new entities
router.post("/", EntityController.createEntity);

// add new attributes
router.post("/:entityId/attrs", EntityController.addAttribute);

// list entities
router.get("/", EntityController.listEntities);

// retrieve the details of a single entity
router.get("/:entityId", EntityController.retrieveEntity);

// update an attribute
router.patch("/:entityId/attrs/:attribute", EntityController.updateAttribute);

// update multiple attributes
router.patch("/:entityId/attrs", EntityController.updateAttributes);

// delete an entity
router.delete("/:entityId", EntityController.deleteEntity);

// delete an attribute
router.delete("/:entityId/attrs/:attribute", EntityController.deleteAttribute);

router.post("/entityOperations/create", EntityController.batchCreate);
router.post("/entityOperations/update", EntityController.batchUpdate);
router.post("/entityOperations/upsert", EntityController.batchUpsert);
router.post("/entityOperations/delete", EntityController.batchDelete);

router.get("/get/record", EntityController.getRecord);

module.exports = router;
