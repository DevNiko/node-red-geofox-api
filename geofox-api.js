const crypto = require("crypto");
const rpn = require("request-promise-native");
const moment = require("moment-timezone");
const apiEndpoint = "https://geofox.hvv.de/gti/public/";

// set timezone for "de-DE"
moment()
  .tz("Europe/Berlin")
  .format();

/**
 * Creates hmac signature for all api requests
 *
 * @param {String} messageBody
 * @param {String} apiSecretKey
 */
function createSignature(messageBody, apiSecretKey) {
  return crypto
    .createHmac("sha1", apiSecretKey)
    .update(JSON.stringify(messageBody))
    .digest("base64");
}

/**
 * Build Geofox GTI request header
 *
 * @param {String} apiUser
 * @param {String} signature
 */
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

/**
 * Check a station name
 * @param {Object} msgBody
 * @param {String} apiUser
 * @param {String} apiSecret
 */
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

/**
 * Retrieve departure list for given body data.
 *
 * @param {Object} msgBody
 * @param {String} apiUser
 * @param {String} apiSecret
 */
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
    serviceTypesUbahn = false,
    serviceTypesAkn = false,
    serviceTypesRbahn = false,
    serviceTypesFernbahn = false,
    serviceTypesAst = false,
    serviceTypesFaehre = false,
    serviceTypesNachtbus = false
  } = data;

  if (serviceTypesBus === true) serviceTypes.push("BUS");
  if (serviceTypesZug === true) serviceTypes.push("ZUG");
  if (serviceTypesSbahn === true) serviceTypes.push("SBAHN");
  if (serviceTypesUbahn === true) serviceTypes.push("UBAHN");
  if (serviceTypesAkn === true) serviceTypes.push("AKN");
  if (serviceTypesFernbahn === true) serviceTypes.push("FERNBAHN");
  if (serviceTypesAst === true) serviceTypes.push("AST");
  if (serviceTypesFaehre === true) serviceTypes.push("FAEHRE");
  if (serviceTypesNachtbus === true) serviceTypes.push("NACHTBUS");
  if (serviceTypesRbahn === true) serviceTypes.push("RBAHN");

  return serviceTypes;
}

/**
 * Retrieve the departures
 *
 * @param {Object} data
 */
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

  // Check the station name
  const cnResponse = await checkname(cnRequestBody, user, secret);

  let { results } = cnResponse;
  let { id, city } = results[0];

  // use auto corrected city name from checkname response
  if (city && cityFromInput !== city) {
    cityFromInput = city;
  }

  // prepare the data for the departure list request
  const departureListBody = {
    version: 37,
    language: "de",
    station: {
      id: id,
      name: station,
      city: cityFromInput,
      combinedName: station + ", " + cityFromInput,
      type: "STATION"
    },
    serviceTypes: extractServiceTypesFromData(data),
    allStationsInChangingNode: true,
    time: {
      date: moment().format("DD.MM.YYYY"),
      time: moment().format("HH:mm")
    },
    maxList: parseInt(maxList) !== isNaN ? parseInt(maxList) : 5,
    maxTimeOffset:
      parseInt(maxTimeOffset) !== isNaN ? parseInt(maxTimeOffset) : 10,
    useRealtime: true
  };

  const departureListResponse = await departureList(
    departureListBody,
    user,
    secret
  );
  const { error = "", departures = [], time } = departureListResponse;
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
    departures.forEach(function(curentElement, index) {
      if (curentElement.delay > 0) {
        // delay seconds in minutes
        curentElement.delay = curentElement.delay / 60;
      }
    });

    payload = {
      station: departureListBody.station.name,
      requestedDepartureTime: moment(
        time.date + " " + time.time,
        "DD.MM.YYYY HH:mm"
      ).valueOf(),
      departures: departures
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
