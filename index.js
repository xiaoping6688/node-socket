var net = require("net");
var ExBuffer = require("./lib/ExBuffer");

var client = null;
var exBuffer = null;
var connectCallback = null;
var receiveCallback = null;
var closeCallback = null;
var serverPort = null;
var serverHost = null;
var hasShutdown = false;
var debuger = console.log;

function connect(port, host, onConnected, onReceived, onClosed){
  close(false);

  if (port){
    serverPort = port;
  }
  if (host){
    serverHost = host;
  }
  if (onConnected){
    connectCallback = onConnected;
  }
  if (onReceived){
    receiveCallback = onReceived;
  }
  if (onClosed){
    closeCallback = onClosed;
  }

  client = net.connect(serverPort, serverHost, function(){
    debuger('Client connected: ' + serverHost + ":" + serverPort);

    if (typeof connectCallback === "function"){
      connectCallback();
    }

    exBuffer = new ExBuffer().int8Tag().uint32Head().bigEndian();
    exBuffer.on('data', onReceivePackData);

    client.on('data', function(data) {
      exBuffer.put(data);
    });

    client.on('end', function() {
      debuger('Client disconnected from server');
      if (typeof closeCallback === "function"){
        closeCallback();
      }
    });

    client.on('timeout', function() {
      debuger('The socket times out.');
      //setTimeout(reconnect, 1000);
    });
  });

  client.on('error', function(error){
    debuger("The socket had an error: " + error.code);
    setTimeout(reconnect, 1000);
  });

  client.on('close', function() {
    debuger('The socket closed.');
  });

  //client.setTimeout(15000);
}

function reconnect(){
  if (!hasShutdown){
    connect();
  }
}

function close(shutdown = true) {
  hasShutdown = shutdown;
  if (client){
    client.end();
    client.destroy();
    client = null;
  }
}

function send(cmd, arg){
  debuger('[Send] tag: ' + cmd + ' value: ' + (arg ? JSON.stringify(arg) : ''));
  if (client){
    var data = null, len = 0;
    if (arg){
      data = JSON.stringify(arg);
      len = Buffer.byteLength(data);
    }

    //写入1个字节的tag
    var tagBuf = new Buffer(1);
    tagBuf.writeInt8(cmd, 0);
    client.write(tagBuf);

    //写入4个字节的length
    var headBuf = new Buffer(4);
    headBuf.writeUInt32BE(len, 0);
    client.write(headBuf);

    //写入value
    if (len > 0){
      var bodyBuf = new Buffer(len);
      bodyBuf.write(data);
      client.write(bodyBuf);
    }
  } else {
    debuger("socket 未连接");
  }
}

function onReceivePackData(data){
  var tag = data.tag;
  var value = data.value ? data.value.toString() : null;
  debuger('[Received] tag: ' + tag + ' value: ' + value);

  if (value){
    value = JSON.parse(value);
  }

  if (typeof receiveCallback === "function"){
    receiveCallback(tag, value);
  }
}

function setDebuger(value){
  debuger = value;
}

module.exports.setDebuger = setDebuger;
module.exports.connect = connect;
module.exports.close = close;
module.exports.send = send;
