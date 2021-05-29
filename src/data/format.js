const entityDoc = {
  _id: ObjectId,
  path: "",
  parent: ObjectId,
  attrs: {
    kind: {
      type: "data",
      value: "Site",
    },
    name: {
      type: "data",
      value: "Site 1",
    },
    voltage: {
      type: "data",
      value: 230,
      record: true,
    },
    Voltage: {
      type: "alias",
      ref: "voltage",
    },
    Current: {
      type: "link",
      target: {
        entity: ObjectId,
        attr: "current",
      },
    },
  },
};

const device1 = {
  _id: ObjectId,
  path: "",
  parent: ObjectId,
  attrs: {
    device_id: "01",
    device_name: "inverter01",
    device_kind: "inverter",
    device_channels: {
      type: "data",
      value: [
        {
          channel_id: "01",
          channel_name: "voltage",
          channel_type: "number",
        },
        {
          channel_id: "02",
          channel_name: "current",
          channel_type: "number",
        },
      ],
    },
    "01": {
      type: "data",
      value: 220,
    },
    "02": {
      type: "data",
      value: 30,
    },
    voltage: {
      type: "alias",
      ref: "01",
    },
    current: {
      type: "alias",
      ref: "02",
    },
  },
};

const channel1 = {
  _id: ObjectId,
  path: "",
  parent: ObjectId,
  attrs: {
    channel_id: "01",
    channel_name: "voltage",
    channel_type: "number",
  },
};
