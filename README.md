# node-socket
TCP Socket with TLV packet （Node端基于TLV二进制协议格式进行封装的socket工具库，包括粘包断包处理）


## Install

```
$ npm install --save node-socket
```


## Usage

```js
const socket = require('node-socket')
socket.connect(port, host, onConnected, onReceived, onClosed)

//=> @see example.js
```
