const crypto = require("crypto");
const rpn = require("request-promise-native");
const moment = require("moment");
const apiEndpoint = "https://geofox.hvv.de/gti/public/";

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
      let { errorText, errDevInfo = "" } = error;
      return new Error(
        "Geofox API 'departureList' Request Error: " +
          statusCode +
          " - " +
          errorText +
          " - " +
          errDevInfo
      );
    });
}

module.exports = function(RED) {
  function GeofoxApiNode(config) {
    RED.nodes.createNode(this, config);
    this.apiUser = config.user;
    this.apiSecret = config.secret;
    this.station = config.station;
    this.city = config.city;
    let node = this;

    node.on("input", async function(msg) {
      this.log("on input");

      let date = new Date();
      // Plus 60 Minutes from Now
      date.setMinutes(date.getMinutes() + 60);
      moment.locale("de");

      const cnRequestBody = {
        coordinateType: "EPSG_4326",
        maxList: 1,
        theName: {
          name: node.station,
          type: "STATION"
        }
      };

      const cnResponse = await checkname(
        cnRequestBody,
        node.apiUser,
        node.apiSecret
      );

      let { results } = cnResponse;
      let { id, city } = results[0];

      // use corrected city name
      if (city && node.city !== city) {
        node.city = city;
      }

      const msgBody = {
        station: {
          id: id,
          name: node.station,
          city: city,
          combinedName: node.station + " " + node.city,
          type: "STATION"
        },
        serviceTypes: ["ZUG"],
        time: {
          date: moment().format("L"),
          time: moment().format("LT")
        },
        useRealtime: true
      };

      const response = await departureList(
        msgBody,
        node.apiUser,
        node.apiSecret
      );
      const { returnCode, errorText = "", error = {} } = response;
      let payload = response;

      if (returnCode === "ERROR_TEXT" && errorText !== "") {
        payload = {
          error: {
            code: "Geofox API Error",
            message: errorText
          }
        };
      }

      if (typeof error === Error) {
        node.error(error);
      }

      msg.payload = payload;
      node.send(msg);
    });
  }
  RED.nodes.registerType("geofox-api", GeofoxApiNode);
};
