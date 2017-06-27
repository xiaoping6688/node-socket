# node-socket
>Based on node.js tcp socket of TLV packet structure （Node端基于TLV二进制协议格式进行封装的socket工具库，包括粘包断包处理）

[![npm package](https://img.shields.io/npm/v/node-socket.svg?style=flat-square)](https://www.npmjs.org/package/node-socket)
[![NPM downloads](http://img.shields.io/npm/dm/node-socket.svg?style=flat-square)](https://npmjs.org/package/node-socket)
[![Percentage of issues still open](http://isitmaintained.com/badge/open/xiaoping6688/node-socket.svg)](http://isitmaintained.com/badge/open/xiaoping6688/node-socket "Percentage of issues still open")

其他相关
- [mqtt-socket](https://github.com/xiaoping6688/mqtt-socket)：Eclipse Paho MQTT Client 封装，实现重连、队列和日志功能等
- [easemob-webim-socket](https://github.com/xiaoping6688/easemob-webim-socket)：环信WEBIM实时通信封装 + 客户端模拟器（electron）

## Install

```
$ npm install --save node-socket
```


## Usage

```js
// for client
const socket = require('node-socket').client
socket.connect(options, onConnected, onReceived)

function onReceived (tag, value) {
  switch (tag){
    case TAG_FROM_REGIST_SUCCESS:

      // send message to server
      socket.send(1, { token: '123' })

      break;
    case TAG_FROM_REGIST_FAIL:

      break;
  }
}


// for server
const server = require('node-socket').server

var options = {
  port: 11000,
  timeout: 15000,
  heartbeatTag: 0,
  heartbeatInterval: 7000,
  recreateInterval: 1000
}

server.listen(options, onClientConnected, onClientDisconncted, onClientReceived)

function onClientReceived (tag, value, from) {
  // server.broadcast(tag, value) // all
  server.broadcast(tag, value, null, from) // all, except from
  // server.broadcast(tag, value, clientList, from);
}

//=> @see test_server.js
//=> @see test_client.js
```
