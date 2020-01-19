const crypto = require('crypto-js');


function createSignature(messageBody, apiSecretKey) {
    let hmac = crypto.HmacSHA1(JSON.stringify(messageBody), apiSecretKey);
    return hmac.digest('base64');
}

module.exports = function (RED) {
    function GeofoxApiNode(config) {
        RED.nodes.createNode(this, config);
        this.geofoxSecret = config.secret;
        this.departure = config.departure;
        let node = this;

        node.on('input', function (msg) {
            this.log("on input");
            console.log("secret: " + node.geofoxSecret);
            let msgBody = {
                departure: node.departure
            }

            let signature = createSignature(msgBody, node.geofoxSecret);
            this.log(`Signature: ${signature}`);

            msg.payload = msg.payload;
            node.send(msg);
        });
    }
    RED.nodes.registerType("geofox-api", GeofoxApiNode);
}