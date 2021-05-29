var flattenObject = function (obj) {
  var toReturn = {};

  for (var i in obj) {
    if (!obj.hasOwnProperty(i)) continue;

    if (
      typeof obj[i] == "object" &&
      obj[i] !== null &&
      !Array.isArray(obj[i])
    ) {
      var flatObject = flattenObject(obj[i]);
      for (var x in flatObject) {
        toReturn[i + "." + x] = flatObject[x];
      }
    } else {
      toReturn[i] = obj[i];
    }
  }
  return toReturn;
};

module.exports = flattenObject;
