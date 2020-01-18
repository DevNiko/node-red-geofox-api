const crypto = require('crypto-js');


function createSignature(requestBody, apiSecretKey) {
    const hmac = crypto.createHmac('sha1', apiSecretKey); // unfortunataly geofox supports only sha1
    hmac.update(JSON.stringify(requestBody));
    return hmac.digest('base64');
}


module.exports = function (RED) {
    function GeofoxApiNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.on('input', function (msg) {
            let signature = createSignature(msg, apiSecretKey);
            msg.payload = msg.payload;
            node.send(msg);
        });
    }
    RED.nodes.registerType("geofox-api", GeofoxApiNode);
}