const crypto = require("crypto");
const rpn = requitre("request-promise-native");
const apiEndpoint = "https://geofox.hvv.de/gti/public/";

function createSignature(messageBody, apiSecretKey) {
  return crypto
    .createHmac("sha1", apiSecretKey)
    .update(JSON.stringify(messageBody))
    .digest("hex");
}

function departureList(station, signature) {
  var options = {
    uri: apiEndpoint + "departureList",
    headers: {
      Accept: "application/json",
      "User-Agent": "Request-Promise",
      "X-Platform": "web",
      "geofox-auth-user": "NikoStraub",
      "geofox-auth-signature": signature
    },
    json: true,
    method: "POST",
    body: {
      station: station,
      time: "",
      useRealtime: true
    }
  };

  rp(options)
    .then(function(response) {
      console.log(response);
    })
    .catch(function(err) {
      console.log(err);
    });
}

module.exports = function(RED) {
  async function GeofoxApiNode(config) {
    RED.nodes.createNode(this, config);
    this.geofoxSecret = config.secret;
    this.departureStation = config.departure;
    let node = this;

    node.on("input", function(msg) {
      this.log("on input");
      let msgBody = {
        departure: node.departure
      };

      const signature = createSignature(msgBody, node.geofoxSecret);
      const departures = await departureList(departureStation, signature);


      msg.payload = msg.payload;
      node.send(msg);
    });
  }
  RED.nodes.registerType("geofox-api", GeofoxApiNode);
};
