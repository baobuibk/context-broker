const entitySchema = {
  $jsonSchema: {
    bsonType: "object",

    required: ["_id", "path", "attrs"],

    properties: {
      _id: { bsonType: "objectId" },
      path: { bsonType: "string" },
      attrs: { bsonType: "object" },
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
