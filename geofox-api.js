const crypto = require("crypto");
const rpn = require("request-promise-native");
const apiEndpoint = "https://geofox.hvv.de/gti/public/";

function createSignature(messageBody, apiSecretKey) {
  return crypto
    .createHmac("sha1", apiSecretKey)
    .update(JSON.stringify(messageBody))
    .digest("base64");
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
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "Request-Promise",
      "X-Platform": "web",
      "geofox-auth-user": apiUser,
      "geofox-auth-signature": signature
    },
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
      throw new Error(
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

    node.on("input", function(msg) {
      this.log("on input");

      let date = new Date();
      // Plus 60 Minutes from Now
      date.setMinutes(date.getMinutes() + 60);

      const msgBody = {
        station: {
          name: this.station,
          city: this.city,
          combinedName: this.station + " " + this.city,
          type: "STATION"
        },
        time: {
          date: date.toISOString().slice(0, 10),
          time: date.getTime()
        },
        useRealtime: true
      };

      msg.payload = departureList(msgBody, node.apiUser, node.apiSecret)
        .then(function(response) {
          return response;
        })
        .catch(function(err) {
          console.log(err);
          node.error(err);
        });

      node.send(msg);
    });
  }
  RED.nodes.registerType("geofox-api", GeofoxApiNode);
};
