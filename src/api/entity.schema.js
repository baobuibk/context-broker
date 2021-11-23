module.exports = {
  $jsonSchema: {
    bsonType: "object",

    required: ["_id"],

    properties: {
      _id: { bsonType: "objectId" },
    },
  },
};

// patternProperties: {
//   "^s_": { bsonType: "string" },
//   "^n_": { bsonType: "number" },
//   "^b_": { bsonType: "bool" },
// },
// additionalProperties: false,
