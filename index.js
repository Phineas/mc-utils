var net = require("net");
var request = require('request');
var pcbuffer = require("./buffer");

var api = {};

api.uuid = function(username, callback) {
    request({
        uri: 'https://api.mojang.com/users/profiles/minecraft/' + username,
        method: 'GET',
        timeout: 3000
    }, function(err, res, uuid) {
        if (!uuid) {
            callback(new Error("User does not exist"), null);
        } else {
            uuid = JSON.parse(uuid);
            callback(uuid, null);
        }
    });
}

api.status = function(type, callback) {

    var services = {
        'sessionserver.mojang.com': 'Sessions',
        'authserver.mojang.com': 'Auth',
        'textures.minecraft.net': 'Skins',
        'api.mojang.com': 'API'
    };

    request({
        uri: 'https://status.mojang.com/check',
        method: 'GET',
        timeout: 3000
    }, function(err, res, statuses) {
        if (err) {
            callback(new Error("Could not load statuses"), null);
        } else {
            statuses = JSON.parse(statuses);

            for (var i = 0; i < statuses.length; i++) {
                var service = statuses[i];
                var name = Object.keys(service)[0];

                if (name in services) {
                    callback(service, null)
                }
            }
        }
    });
}


api.ping = function(server, port, callback, timeout, protocol) {
    var MC_DEFAULT_PORT = 25565;

    if (typeof port == "function") {
        callback = port;
        port = MC_DEFAULT_PORT;
    }

    if (typeof port !== "number") {
        port = MC_DEFAULT_PORT;
    }

    if (typeof timeout == "undefined") {
        timeout = 3000;
    }

    // Use the specified protocol version, if supplied
    if (typeof protocol !== "number") {
        protocol = 47;
    }

    var socket = net.connect({
        port: port,
        host: server
    }, function() {
        // Write out handshake packet.
        var handshakeBuffer = pcbuffer.createBuffer();

        handshakeBuffer.writeVarInt(0);
        handshakeBuffer.writeVarInt(protocol);
        handshakeBuffer.writeString(server);
        handshakeBuffer.writeUShort(port);
        handshakeBuffer.writeVarInt(1);

        writePCBuffer(socket, handshakeBuffer);

        // Write the set connection state packet, we should get the MOTD after this.
        var setModeBuffer = pcbuffer.createBuffer();

        setModeBuffer.writeVarInt(0);

        writePCBuffer(socket, setModeBuffer);
    });

    socket.setTimeout(timeout, function() {
        if (callback) {
            callback(new Error("Socket timed out when connecting to " + server + ":" + port), null);
        }

        socket.destroy();
    });

    var readingBuffer = new Buffer(0);

    socket.on('data', function(data) {
        readingBuffer = Buffer.concat([readingBuffer, data]);

        var buffer = pcbuffer.createBuffer(readingBuffer);
        var length;

        try {
            length = buffer.readVarInt();
        } catch (err) {
            // The buffer isn't long enough yet, wait for more data!
            return;
        }

        // Make sure we have the data we need!
        if (readingBuffer.length < length - buffer.offset()) {
            return;
        }

        // Read the packet ID, throw it away.
        buffer.readVarInt();

        try {
            var json = JSON.parse(buffer.readString());

            // We parsed it, send it along!
            callback(null, json);
        } catch (err) {
            // Our data is corrupt? Fail hard.
            callback(err, null);

            return;
        }

        // We're done here.
        socket.destroy();
    });

    socket.once('error', function(err) {
        if (callback) {
            callback(err, null);
        }

        socket.destroy();
    });
};

// Wraps our Buffer into another to fit the Minecraft protocol.
function writePCBuffer(client, buffer) {
    var length = pcbuffer.createBuffer();


    length.writeVarInt(buffer.buffer().length);

    client.write(Buffer.concat([length.buffer(), buffer.buffer()]));
}

module.exports = api;
