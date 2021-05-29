const recordSchema = {
  $jsonSchema: {
    bsonType: "object",

    required: ["_id", "entity"],

    properties: {
      _id: { bsonType: "objectId" },
      entity: { bsonType: "objectId" },

      samples: {
        bsonType: "array",
        items: {
          bsonType: "object",
          required: ["v", "t"],
        },
      },
    },
  },
};

module.exports = recordSchema;
