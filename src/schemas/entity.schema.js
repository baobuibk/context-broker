const entitySchema = {
  $jsonSchema: {
    bsonType: "object",

    required: ["_id", "path", "attrs"],

    properties: {
      _id: { bsonType: "objectId" },
      path: { bsonType: "string" },
      attrs: {
        bsonType: "object",
        required: ["kind", "name"],
        properties: {
          kind: {
            bsonType: "object",
            required: ["type", "value"],
            properties: {
              type: { bsonType: "string" },
              value: { bsonType: "string" },
            },
          },
          name: {
            bsonType: "object",
            required: ["type", "value"],
            properties: {
              type: { bsonType: "string" },
              value: { bsonType: "string" },
            },
          },
        },
      },
    },
  },
};

module.exports = entitySchema;

// patternProperties: {
//   "^s_": { bsonType: "string" },
//   "^n_": { bsonType: "number" },
//   "^b_": { bsonType: "bool" },
// },
// additionalProperties: false,
