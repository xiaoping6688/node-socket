// *************************** connect to server ******************************

var port = 11000;
var host = "127.0.0.1";

var TAG_SEND_REGIST = 1;
var TAG_FROM_REGIST_SUCCESS = 'a';
var TAG_FROM_REGIST_FAIL = 'b';

var token = "123";

var socket = require("./index").client;

var options = {
  port:port,
  host:host
}

socket.connect(options, onConnected, onReceived);

function onConnected () {
  socket.send(TAG_SEND_REGIST, { token: token });
}

function onReceived (tag, value) {
  switch (tag){
    case TAG_FROM_REGIST_SUCCESS:

      break;
    case TAG_FROM_REGIST_FAIL:

      break;
  }
}
