const net = require("net"),
      request = require('request'),
      lo = require('lodash'),
      pcbuffer = require("./buffer");

var api = {};

api.name = function(uuid, callback) {
    //Check if input UUID is formatted, then unformats it for the request
    if (uuid.indexOf('-') > -1) {
        uuid = uuid.replace(/-/g, '');
    }

    request({
        uri: 'https://api.mojang.com/user/profiles/' + uuid + '/names',
        method: 'GET',
        timeout: 3000
    }, function(err, res, username) {
        if (!username) {
            callback(new Error("UUID does not exist"), null);
        } else {
            body = JSON.parse(username);

            //Check if they've had name changes before -> output correct name
            if (body.length == 1) {
                username = body[0];
            } else {
                username = body[body.length - 1];
            }

            callback(null, username);
        }
    })
}

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
            callback(null, uuid);
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
            callback(new Error("Data is corrupt"), null);

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

api.parseMotD = function(motd, callback) {

  rules = {
      color: {
  	    '§0': 'black',
  	    '§1': 'dark-blue',
  	    '§2': 'dark-green',
  	    '§3': 'dark-aqua',
  	    '§4': 'dark-red',
  	    '§5': 'dark-purple',
  	    '§6': 'gold',
  	    '§7': 'gray',
  	    '§8': 'dark-gray',
  	    '§9': 'blue',
  	    '§a': 'green',
  	    '§b': 'aqua',
  	    '§c': 'red',
  	    '§d': 'light-purple',
  	    '§e': 'yellow',
  	    '§f': 'white',
  	},
      weight: {
      	'§l': 'bold',
      },
      special: {
      	'§k': 'magic',
      },
      decoration: {
      	'§m': 'strikethrough',
      	'§n': 'underline',
      },
      style: {
      	'§o': 'italic',
      }
  };

    if (typeof motd != 'string') {
        return callback('Invalid MotD: Please use a string');
    }

    var res = [];
    var cursor = -1;

    function addString(cursor, motd) {
        if (cursor == -1) {
            cursor++
        }

        if (res[cursor]) {
            res[cursor].motd += motd;
        } else {
            res[cursor] = {
                rules: {},
                motd: motd
            };
        }
    }

    for (var i = 0; i < motd.length; i++) {
        if (motd[i] == '§') {
            var tMtd = motd[i] + motd[i + 1];

            if (tMtd == '§r') {
                res[++cursor] = {
                    rules: {},
                    motd: ''
                };

                i++
            } else {
                var ruler = ruleEquality(tMtd);
                if (ruler) {
                    var newRules = res[cursor] ? lo.clone(res[cursor].rules) : {};
                    newRules[ruler.type] = ruler.rule;
                    res[++cursor] = {
                        rules: newRules,
                        motd: ''
                    };
                    i++
                } else {
                  //Append as string
                    addString(cursor, motd[i]);
                }
            }
        } else {
            addString(cursor, motd[i]);
        }
    }

    callback(null, res);
};

// Wraps our Buffer into another to fit the Minecraft protocol.
function writePCBuffer(client, buffer) {
    var length = pcbuffer.createBuffer();


    length.writeVarInt(buffer.buffer().length);

    client.write(Buffer.concat([length.buffer(), buffer.buffer()]));
}

function ruleEquality(string) {
    for (var type in rules) {
        if (rules[type][string]) {
            return {
                type: type,
                rule: rules[type][string]
            };
        }
    }
    return null;
}

module.exports = api;
