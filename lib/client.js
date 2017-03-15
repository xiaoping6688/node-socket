/**
 * Socket客户端
 */

var net = require("net")
var ExBuffer = require("./ExBuffer")

var client = null
var exBuffer = null
var connectCallback = null
var receiveCallback = null
var serverPort = null
var serverHost = null
var disconnected = false
var debuger = console.log

var defaultOptions = {
  timeout: 15000,
  heartbeatTag: 0,
  reconnectInterval: 1000
}

/**
 * Connect to server
 * @param port (required) Server port
 * @param host (required) Server hostname
 * @param onDisconncted (optional) On the client connected, callback()
 * @param onReceived (optional) On the client received messages, callback(tag, value)
 */
function connect(options, onConnected, onReceived){
  close(false)

  if (options && options.timeout) {
    defaultOptions.timeout = options.timeout
  }
  if (options && options.heartbeatTag) {
    defaultOptions.heartbeatTag = options.heartbeatTag
  }
  if (options && options.reconnectInterval) {
    defaultOptions.reconnectInterval = options.reconnectInterval
  }

  if (options && options.port){
    serverPort = options.port
  }
  if (options && options.host){
    serverHost = options.host
  }
  if (onConnected){
    connectCallback = onConnected
  }
  if (onReceived){
    receiveCallback = onReceived
  }

  client = net.connect(serverPort, serverHost, function () {
    debuger('Client has connected to: ' + serverHost + ":" + serverPort)

    exBuffer = new ExBuffer().int8Tag().uint32Head().bigEndian()
    exBuffer.on('data', onReceivePackData)

    client.on('data', function(data) {
      exBuffer.put(data)
    })

    client.on('end', function() {
      debuger('The socket has been disconnected by server')
    })

    client.on('timeout', function() {
      debuger('The socket has timed out.')
      setTimeout(reconnect, defaultOptions.reconnectInterval)
    })

    if (typeof connectCallback === "function"){
      connectCallback()
    }
  })

  client.on('error', function(error) {
    debuger("The socket occured an error: " + error)
    setTimeout(reconnect, defaultOptions.reconnectInterval)
  })

  client.on('close', function() {
    debuger('The socket closed.')
  })

  client.setTimeout(defaultOptions.timeout)
}

function reconnect(){
  if (!disconnected){
    connect()
  }
}

/**
 * Close the client
 * @param disconnect
 */
function close(disconnect = true) {
  disconnected = disconnect

  if (client){
    client.destroy()
    client = null
  }
}

/**
 * Send message to server
 * @param cmd means tag
 * @parma arg means value
 */
function send(cmd, arg){
  debuger('[Send] tag: ' + cmd + ' value: ' + (arg ? JSON.stringify(arg) : ''))

  if (client){
    var data = null, len = 0
    if (arg){
      data = JSON.stringify(arg)
      len = Buffer.byteLength(data)
    }

    // TLV pack:
    // Write the tag: use one byte
    var tagBuf = Buffer.alloc(1)
    tagBuf.writeInt8(cmd, 0)
    client.write(tagBuf)

    // Write the length of value: use four bytes
    var headBuf = Buffer.alloc(4)
    headBuf.writeUInt32BE(len, 0)
    client.write(headBuf)

    // Then, write the value
    if (len > 0){
      var bodyBuf = Buffer.alloc(len)
      bodyBuf.write(data)
      client.write(bodyBuf)
    }
  } else {
    debuger("The socket has not connected yet.")
  }
}

function onReceivePackData(data){
  var tag = data.tag
  var value = data.value ? data.value.toString() : null
  debuger('[Received] tag: ' + tag + ' value: ' + value)

  // ignore heartbeat response
  if (tag === defaultOptions.heartbeatTag) return

  if (value){
    value = JSON.parse(value)
  }

  if (typeof receiveCallback === "function"){
    receiveCallback(tag, value)
  }
}

function setDebuger(value){
  debuger = value
}

module.exports.setDebuger = setDebuger
module.exports.connect = connect
module.exports.close = close
module.exports.send = send
