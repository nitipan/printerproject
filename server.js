var net = require('net');
var server = net.createServer();
var hexy = require('hexy');

var rx = require('debug')("rx");
var tx = require('debug')("tx");
var connection = require('debug')("connection");
var count;
// print process.argv
var port = 3100;
if (process.argv.length >= 3)
    port = process.argv[2];

server.on('connection', handleConnection);

server.listen(port, function() {
    count = 0;

    connection('server listening to %j', server.address());
});

Number.prototype.pad = function(size) {
    var s = String(this);
    while (s.length < (size || 2)) { s = "0" + s; }
    return s;
}

function handleConnection(conn) {
    var remoteAddress = conn.remoteAddress + ':' + conn.remotePort;
    connection('new client connection from %s', remoteAddress);

    conn.setEncoding('ascii');

    conn.on('data', onConnData);
    conn.once('close', onConnClose);
    conn.on('error', onConnError);

    function onConnData(d) {



        var format = {}
        format.numbering = "hex_bytes";
        format.format = "twos";
        format.caps = "upper";
        format.indent = 1;

        var checksum = calcChecksum(d.toString().replace('\u0002', '').replace('\u0003', ''));
        rx("checksum=%s", checksum);

        var buffer = new Buffer(d);


        rx('[%s] <<< %s', new Date().toISOString(), hexy.hexy(buffer, format));

        var response = null;
        if (buffer.toString()[1] == "R") {
            count = 0;
            response = new Buffer("$" + checksum);
        } else if (buffer.toString()[1] == "G") {

            var text = parseInt(count).pad(10).toString();
            console.log(text);
            var bytes = Array(12);
            bytes[0] = 2;


            for (var i = 1; i <= 10; i++) {
                bytes[i] = parseInt(text[i - 1]) + 48;
            }


            bytes[11] = 3;
            response = new Buffer(bytes);
            count++;

        } else if (buffer.toString()[1] == "E") {

            var bytes = Array(9);
            bytes[0] = 2;

            var status = [0, 1, 2, 3, 4, 5, 6, 7, 8];

            bytes[1] = status[getRandomInt(0, 8)];
            bytes[2] = status[getRandomInt(0, 8)];
            bytes[3] = status[getRandomInt(0, 8)];
            bytes[4] = status[getRandomInt(0, 8)];
            bytes[5] = status[getRandomInt(0, 8)];
            bytes[6] = status[getRandomInt(0, 8)];

            bytes[7] = status[getRandomInt(0, 8)];

            bytes[8] = 3;

            response = new Buffer(bytes);
        } else {
            response = new Buffer("$" + checksum);
        }

        tx('[%s] >>> %s', new Date().toISOString(), hexy.hexy(response, format));
        conn.write(response.toString());
    }

    function onConnClose() {
        connection('connection from %s closed', remoteAddress);
    }

    function onConnError(err) {
        connection('Connection %s error: %s', remoteAddress, err.message);
    }


    function calcChecksum(string) {
        var buf = new Buffer(string);
        // Calculate the modulo 256 checksum
        var sum = 0;
        for (var i = 0, l = buf.length; i < l; i++) {

            sum = (sum + buf[i]) % 256;
        }


        var chars = sum.toString(16).toUpperCase();
        if (chars.length == 1) chars = "0" + chars;
        return chars;
    }

    function getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min;
    }
}