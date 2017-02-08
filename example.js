
var port = 11001; //服务器端口
var server = "10.3.0.175"; //服务器IP
var token = "123"; //注册token

var TAG_SEND_REGIST = 1; //客户端注册
var TAG_SEND_PING = 112; //客户端心跳响应
var TAG_FROM_REGIST_SUCCESS = 'a'; //客户端注册成功
var TAG_FROM_REGIST_FAIL = 'b'; //客户端注册失败
var TAG_FROM_PING = 'p'; //收到服务端心跳指令
var TAG_FROM_CLOSE = 'c'; //连接被服务端关闭

var showDebugData = false;

var socket = require("./index");
// socket.setDebuger(appendLog);
socket.connect(port, server, onConnected, onReceived);

function onConnected () {
  socket.send(TAG_SEND_REGIST, { token: token });
}

function onReceived (tag, value) {
  if (tag != TAG_FROM_PING)
  appendLog('[Received] tag: ' + tag + ' value: ' + JSON.stringify(value));

  switch (tag){
    case TAG_FROM_REGIST_SUCCESS:

      break;
    case TAG_FROM_REGIST_FAIL:

      break;
    case TAG_FROM_PING:
      socket.send(TAG_SEND_PING);
      break;
    case TAG_FROM_CLOSE:

      break;
  }
}

function appendLog (log) {
  if (showDebugData == false) return;

  var debugText = document.getElementById('debugText');
  if (debugText) {
      debugText.innerHTML += log + "<br>";
      debugText.scrollTop = debugText.scrollHeight;
  } else {
    console.log(log);
  }
}
