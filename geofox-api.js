const crypto = require("crypto");
const rpn = require("request-promise-native");
const moment = require("moment");
const apiEndpoint = "https://geofox.hvv.de/gti/public/";

// set date and time format to "de"
moment.locale("de");

function createSignature(messageBody, apiSecretKey) {
  return crypto
    .createHmac("sha1", apiSecretKey)
    .update(JSON.stringify(messageBody))
    .digest("base64");
}

function buildRequestHeaders(apiUser, signature) {
  return {
    "Content-Type": "application/json;charset=UTF-8",
    Accept: "application/json",
    "User-Agent": "Request-Promise",
    "X-Platform": "web",
    "geofox-auth-type": "HmacSHA1",
    "geofox-auth-user": apiUser,
    "geofox-auth-signature": signature
  };
}

function checkname(msgBody, apiUser, apiSecret) {
  if (!apiSecret) {
    return new Promise(function(resolve, reject) {
      reject("No Geofox API Secret provided");
    });
  }

  if (!apiUser) {
    return new Promise(function(resolve, reject) {
      reject("No Geofox User provided");
    });
  }

  const signature = createSignature(msgBody, apiSecret);

  var options = {
    uri: apiEndpoint + "checkName",
    headers: buildRequestHeaders(apiUser, signature),
    json: true,
    method: "POST",
    body: msgBody
  };

  return rpn(options)
    .then(function(response) {
      return response;
    })
    .catch(function(err) {
      let { statusCode, error } = err;
      let { errorText, errDevInfo = "" } = error;
      return new Error(
        "Geofox API 'checkName' Request Error: " +
          statusCode +
          " - " +
          errorText +
          " - " +
          errDevInfo
      );
    });
}

function departureList(msgBody, apiUser, apiSecret) {
  if (!apiSecret) {
    return new Promise(function(resolve, reject) {
      reject("No Geofox API Secret provided");
    });
  }

  if (!apiUser) {
    return new Promise(function(resolve, reject) {
      reject("No Geofox User provided");
    });
  }

  const signature = createSignature(msgBody, apiSecret);

  var options = {
    uri: apiEndpoint + "departureList",
    headers: buildRequestHeaders(apiUser, signature),
    json: true,
    method: "POST",
    body: msgBody
  };

  return rpn(options)
    .then(function(response) {
      return response;
    })
    .catch(function(err) {
      let { statusCode, error } = err;
      let { errorText = "", errDevInfo = "" } = error;
      return {
        error: "Error: " + statusCode + " - " + errorText + " - " + errDevInfo
      };
    });
}

/*
 * determines the means of transport (bus, train ...)
 */
function extractServiceTypesFromData(data) {
  const serviceTypes = [];

  let {
    serviceTypesBus = false,
    serviceTypesZug = false,
    serviceTypesSbahn = false,
    serviceTypesUbahn = false
  } = data;

  if (serviceTypesBus === true) serviceTypes.push("BUS");
  if (serviceTypesZug === true) serviceTypes.push("ZUG");
  if (serviceTypesSbahn === true) serviceTypes.push("SBAHN");
  if (serviceTypesUbahn === true) serviceTypes.push("UBAHN");

  return serviceTypes;
}

async function handleDepartures(data) {
  if (!data) {
    return {};
  }

  let {
    user,
    secret,
    station,
    city: cityFromInput,
    maxList = 3,
    maxTimeOffset = 45
  } = data;

  const cnRequestBody = {
    coordinateType: "EPSG_4326",
    maxList: 1,
    theName: {
      name: station,
      type: "STATION"
    }
  };

  const cnResponse = await checkname(cnRequestBody, user, secret);

  let { results } = cnResponse;
  let { id, city } = results[0];

  // use auto corrected city name from checkname response
  if (city && cityFromInput !== city) {
    cityFromInput = city;
  }

  const departureListBody = {
    station: {
      id: id,
      name: station,
      city: cityFromInput,
      combinedName: station + ", " + cityFromInput,
      type: "STATION"
    },
    serviceTypes: extractServiceTypesFromData(data),
    time: {
      date: moment().format("L"),
      time: moment().format("LT")
    },
    maxList: maxList,
    maxTimeOffset: maxTimeOffset,
    useRealtime: true
  };

  const departureListResponse = await departureList(
    departureListBody,
    user,
    secret
  );
  const { error = "", departures = [] } = departureListResponse;
  let payload = {};

  if (error !== "") {
    payload = {
      error: {
        code: "Geofox API 'departureList' Request Error",
        message: error
      }
    };
  }

  if (departures.length > 0) {
    payload = {
      station: departureListBody.station.name,
      departures: { ...departures }
    };
  }

  return payload;
}

function handleRoute() {}

module.exports = function(RED) {
  function GeofoxApiNode(config) {
    let node;

    RED.nodes.createNode(this, config);

    this.timetableInformation = config.timetableInformation;
    node = this;

    node.on("input", async function(msg) {
      this.log("on input");

      switch (node.timetableInformation) {
        case "departure":
          const response = await handleDepartures(config);
          msg.payload = { ...response };
          break;
        case "route":
          break;
      }

      if (msg.payload && typeof msg.payload.error === Error) {
        node.error(msg.payload.error);
      }

      node.send(msg);
    });
  }
  RED.nodes.registerType("geofox-api", GeofoxApiNode);
};
