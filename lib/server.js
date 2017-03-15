/**
 * Socket服务端
 */

var net = require("net")
var ExBuffer = require("./ExBuffer")

var server = null
var exBuffer = null
var connectCallback = null
var disconnectCallback = null
var receiveCallback = null
var serverPort = null
var disconnected = false
var debuger = console.log
var clientList = []
var heartbeatHandle = 0

var defaultOptions = {
  timeout: 15000,
  heartbeatTag: 0,
  heartbeatInterval: 7000,
  recreateInterval: 1000
}

/**
 * Create server
 * @param port (required) Server port for listen
 * @param onConnected (optional) On a client connected, callback(socket)
 * @param onDisconncted (optional) On a client disconnected, callback(socket)
 * @param onReceived (optional) On a client received message, callback(tag, value, socket)
 */
function createServer(options, onConnected, onDisconncted, onReceived){
  close(false)

  if (options && options.timeout) {
    defaultOptions.timeout = options.timeout
  }
  if (options && options.heartbeatTag) {
    defaultOptions.heartbeatTag = options.heartbeatTag
  }
  if (options && options.heartbeatInterval) {
    defaultOptions.heartbeatInterval = options.heartbeatInterval
  }
  if (options && options.reconnectInterval) {
    defaultOptions.recreateInterval = options.recreateInterval
  }

  if (options && options.port){
    serverPort = options.port
  }
  if (onConnected){
    connectCallback = onConnected
  }
  if (onDisconncted){
    disconnectCallback = onDisconncted
  }
  if (onReceived){
    receiveCallback = onReceived
  }

  clientList = []
  heartbeatHandle = setInterval(heartbeatHandler, defaultOptions.heartbeatInterval)

  server = net.createServer(function (socket) {
    debuger('A socket has connected: ' + socket.remoteAddress + ':' + socket.remotePort)

    // When an idle timeout is triggered the socket will receive a 'timeout' event but the connection will not be severed
    socket.setTimeout(defaultOptions.timeout, function () {
      debuger('The socket has timed out: ' + socket.remoteAddress + ':' + socket.remotePort)
      socket.destroy()
    })

    exBuffer = new ExBuffer().int8Tag().uint32Head().bigEndian()
    exBuffer.on('data', handlerDelegate(onReceivePackData, socket))

    socket.on('data', function (data) {
      exBuffer.put(data)
    })

    socket.on('error', function (error) {
      debuger('The socket occured an error:' + error)
      socket.destroy()
    })

    socket.on('end', function() {
      debuger('The socket ended.')
    })

    socket.on('close', function() {
      debuger('A socket has closed: ' + socket.remoteAddress + ':' + socket.remotePort)
      removeClient(socket)
    })

    addClient(socket)
  })

  server.on('error', function(error) {
    debuger("Server occured an error: " + error)
    setTimeout(recreate, defaultOptions.recreateInterval)
  })

  server.on('close', function() {
    debuger('Server is closed.')
  })

  server.on('listening', function(){
    debuger('Server is listening: ' + serverPort)
  })

  server.listen(serverPort)
}

/**
 * Close the server
 * @param disconnect
 */
function close(disconnect = true) {
  disconnected = disconnect

  if (server){
    clearInterval(heartbeatHandle)

    server.close()
    server = null
  }
}

function heartbeatHandler () {
  for (var i = clientList.length - 1; i >= 0; i--) {
    ping(clientList[i])
  }
}

function ping (client) {
  send(defaultOptions.heartbeatTag, null, client)
}

function addClient (socket) {
  if (socket) {
    clientList.push(socket)

    if (typeof connectCallback === "function"){
      connectCallback(socket)
    }
  }
}

function removeClient (socket) {
  if (socket) {
    var index = clientList.indexOf(socket)
    if (index != -1) {
      clientList.splice(index, 1)

      if (typeof disconnectCallback === "function"){
        disconnectCallback(socket)
      }
    }
  }
}

/**
 * Send message to a client
 * @param cmd means tag
 * @parma arg means value
 * @parma socket the target client
 */
function send(cmd, arg, socket){
  if (socket && socket.writable) {
    if (cmd !== defaultOptions.heartbeatTag) {
      debuger('[Send to ' + socket.remoteAddress + '] tag: ' + cmd + ' value: ' + (arg ? JSON.stringify(arg) : ''))
    }

    var data = null, len = 0
    if (arg){
      data = JSON.stringify(arg)
      len = Buffer.byteLength(data)
    }

    // TLV pack:
    // Write the tag: use one byte
    var tagBuf = Buffer.alloc(1)
    tagBuf.writeInt8(cmd, 0)
    socket.write(tagBuf)

    // Write the length of value: use four bytes
    var headBuf = Buffer.alloc(4)
    headBuf.writeUInt32BE(len, 0)
    socket.write(headBuf)

    // Then, write the value
    if (len > 0){
      var bodyBuf = Buffer.alloc(len)
      bodyBuf.write(data)
      socket.write(bodyBuf)
    }
  }
}

function onReceivePackData(data, socket) {
  var tag = data.tag
  var value = data.value ? data.value.toString() : null

  // ignore heartbeat response
  if (tag === defaultOptions.heartbeatTag) return

  debuger('[Received from ' + socket.remoteAddress + '] tag: ' + tag + ' value: ' + value)

  if (value){
    value = JSON.parse(value)
  }

  if (typeof receiveCallback === "function"){
    receiveCallback(tag, value, socket)
  }
}

function recreate(){
  if (!disconnected){
    createServer()
  }
}

function setDebuger(value){
  debuger = value
}

/**
 * Broadcast message
 * @param cmd (required) the tag
 * @param arg (optional) the value
 * @param list (optional) client list, if not specified it will broadcast all connections
 * @param from (optional) from which client
 */
function broadcast(cmd, arg, list, from) {
  if (!list) {
    list = clientList
  }

  for (var i = list.length - 1; i >= 0; i--) {
    var socket = list[i]
    if (from != socket) {
      if (socket.writable) {
        send(cmd, arg, socket)
      } else {
        socket.destroy()
      }
    }
  }
}

/**
 * 回调函数代理，使其可传任意额外参数（不想用匿名函数的情况下）
 * @param handler 回调函数
 * @param args ...额外参数
 * @return function
 */
function handlerDelegate(handler, ...args) {
  return function (...params) {
    handler.apply(null, params.concat(args))
  }
}

module.exports.setDebuger = setDebuger
module.exports.listen = createServer
module.exports.close = close
module.exports.send = send
module.exports.broadcast = broadcast
