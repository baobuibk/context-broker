const express = require("express");
const router = express.Router();

const EntityController = require("./entity.controller");

// create one entity/ many entities
router.post("/", EntityController.addEntity);

// get many entities
router.get("/", EntityController.getManyEntities);
// get one entity
router.get("/:entityId", EntityController.getOneEntity);

// update entity batch
router.patch("/batch", EntityController.updateEntityBatch);
// update many entities
router.patch("/", EntityController.updateManyEntities);
// update one entity
router.patch("/:entityId", EntityController.updateOneEntity);

// delete many entities
router.delete("/", EntityController.deleteManyEntities);
// delete one entity
router.delete("/:entityId", EntityController.deleteOneEntity);

// add new attributes
// router.post("/:entityId/attrs", EntityController.addAttribute);

// update many attributes
// router.patch("/:entityId/attrs", EntityController.updateManyAttributes);
// update an attribute
// router.patch(
//   "/:entityId/attrs/:attribute",
//   EntityController.updateOneAttribute
// );

// // delete an attribute
// router.delete("/:entityId/attrs/:attribute", EntityController.deleteAttribute);

// replace one entity
// router.put("/:entityId", EntityController.replaceOneEntity);
// replace one attribute
// router.put("/:entityId/attrs/:attribute",EntityController.replaceOneAttribute)

router.get("/:entityId/record", EntityController.getOneEntityRecord);

module.exports = router;
