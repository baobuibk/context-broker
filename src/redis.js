const redis = require("redis");
const client = redis.createClient();

client.on("connect", () => {
  console.log("redis client connect");
});

client.on("ready", () => {
  console.log("redis client ready");
});

client.on("reconnecting", (sth) => {
  console.log("redis client reconnecting", sth);
});

client.on("error", (error) => {
  console.error("redis client error", error);
});

// client.on("end", (sth) => {
//   console.log("redis client end", sth);
// });

client.on("warning", (sth) => {
  console.error("redis client warning", sth);
});

module.exports = client;
