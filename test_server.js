
// *************************** create server ******************************

var port = 11000;

var server = require("./index").server;

var clientList = [];
var options = {
  port:port
}

server.setDebuger(logger)
server.listen(options, onClientConnected, onClientDisconncted, onClientReceived);

function onClientConnected (socket) {
  // clientList.push(socket);
}

function onClientDisconncted (socket) {
  // var index = clientList.indexOf(socket);
  // if (index != -1) {
  //   clientList.splice(index, 1);
  // }
}

function onClientReceived (tag, value, from) {
  // server.broadcast(tag, value) // all
  server.broadcast(tag, value, null, from) // all, except from
  // server.broadcast(tag, value, clientList, from);
}

function logger (log) {
  var now = new Date()
  var time = now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds()
  console.log('[' + time + '] ' + log)
}