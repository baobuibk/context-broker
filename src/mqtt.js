const mqtt = require("mqtt");

const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL;
let client = mqtt.connect(MQTT_BROKER_URL);

client.on("error", (error) => {
  console.log(error);
});

client.on("connect", () => {
  console.log("connected to mqtt broker");

  topicsArr = [
    "up/time/+",
    "up/check/+",
    "up/provision/+",
    "up/telemetry/+",
    "up/command/+",
  ];
  client.subscribe(topicsArr, (error) => {
    if (error) return console.log("mqtt error subscribe to topics");

    console.log("mqtt subscribed to topics");
  });
});

client.on("message", (topic, message) => {
  // message is a buffer, so convert it to string
  const messageString = message.toString();

  const firstSlash = topic.indexOf("/");
  const secondSlash = topic.indexOf("/", firstSlash + 1);

  const type = topic.slice(firstSlash + 1, secondSlash);
  const apikey = topic.slice(secondSlash + 1);

  switch (type) {
    case "provision":
      return handleProvision(apikey, messageString);
    case "telemetry":
      return handleTelemetry(apikey, messageString);
    case "command":
      return handleCommand(apikey, messageString);
    case "check":
      return handleCheck(apikey, messageString);
    case "time":
      return handleTime(apikey, messageString);
    default:
      console.log("mqtt topic not recognized");
      break;
  }
});

async function handleProvision(apikey, message) {
  console.log("provision from", apikey);

  const downTopic = `down/provision/${apikey}`;
  try {
    const provisionObj = JSON.parse(message);
    provisionObj.entity = apikey;
    axios
      .post(CONTEXT_BROKER_URL + "/provision", provisionObj)
      .then(({ data }) => MQTT.publish(downTopic, data))
      .catch((error) => {
        if (error.response) {
          console.log(
            "provision request to context-broker failed:",
            error.response.data
          );
          MQTT.publish(downTopic, error.response.data);
        } else console.log(error.message);
      });
  } catch (error) {
    console.log(error.message);
    MQTT.publish(downTopic, "mqtt-agent error");
  }
}

async function handleTelemetry(apikey, message) {
  console.log("telemetry from", apikey);

  try {
    const telemetryObj = JSON.parse(message);
    telemetryObj.entity = apikey;
    await axios.post(CONTEXT_BROKER_URL + "/telemetry", telemetryObj);
    console.log("telemetry ok");
  } catch (error) {
    console.log(error.message);
  }
}

async function handleCommand(apikey, message) {
  console.log("command response from", apikey);
  console.log(message);
}

function handleCheck(apikey, message) {
  console.log("check from", apikey);
  const topic = `down/check/${apikey}`;
  MQTT.publish(topic, message);
}

async function handleTime(apikey, message) {
  console.log("time from", apikey);
  const now = new Date();
  const response = {
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1,
    day: now.getUTCDate(),
    hour: now.getUTCHours(),
    minute: now.getUTCMinutes(),
    second: now.getUTCSeconds(),
  };
  const downTopic = "down/time/" + apikey;
  MQTT.publish(downTopic, response);
}

module.exports = client;
