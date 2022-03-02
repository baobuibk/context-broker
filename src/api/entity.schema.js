module.exports = {
  $jsonSchema: {
    bsonType: "object",
    required: ["_id", "type"],

    properties: {
      _id: { bsonType: "objectId" },
      type: { bsonType: "string" },
    },
  },
};

// patternProperties: {
//   "^s_": { bsonType: "string" },
//   "^n_": { bsonType: "number" },
//   "^b_": { bsonType: "bool" },
// },
// additionalProperties: false,
