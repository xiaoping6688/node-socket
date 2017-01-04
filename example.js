
var port = 11001; //服务器端口
var server = "10.3.0.175"; //服务器IP
var tid = "1"; //客户端或教室ID

var TAG_SEND_REGIST = 1; //客户端注册
var TAG_SEND_PING = 112; //客户端心跳响应
var TAG_FROM_REGIST_SUCCESS = 1; //客户端注册成功
var TAG_FROM_REGIST_FAIL = 0; //客户端注册失败
var TAG_FROM_PING = 112; //服务端心跳指令
var TAG_FROM_END_QUIZ = 8; //答题结束
var TAG_FROM_START_QUIZ = 7; //开始答题
var TAG_FROM_ANSWER = 10; //学生答题
var TAG_FROM_CLOSE = 11; //关闭或未就绪状态

var showDebugData = false;
var needReconnect = true;

//和服务器建立socket连接
var socket = require("./index");
// socket.setDebuger(appendLog);
socket.connect(port, server, function(){
  socket.send(TAG_SEND_REGIST, {classId: tid});
}, render, function(){
  if (needReconnect) {
    setTimeout(socket.connect, 1000);
  }
});

function render(tag, value){
  if (tag != TAG_FROM_PING)
  appendLog('[Received data] tag: ' + tag + ' value: ' + JSON.stringify(value));

  switch (tag){
    case TAG_FROM_REGIST_SUCCESS: //注册成功
      //needReconnect = false;
      break;
    case TAG_FROM_REGIST_FAIL: //注册失败
      //needReconnect = true;
      break;
    case TAG_FROM_PING: //心跳
      socket.send(TAG_SEND_PING);
      break;
    case TAG_FROM_CLOSE: //关闭

      break;
    case TAG_FROM_END_QUIZ: //结束答题

      break;
    case TAG_FROM_START_QUIZ: //开始答题

      break;
    case TAG_FROM_ANSWER: //学生答题

      break;
  }
}

function appendLog(log){
  if (showDebugData == false) return;

  var debugText = document.getElementById('debugText');
  if (debugText) {
      debugText.innerHTML += log + "<br>";
      debugText.scrollTop = debugText.scrollHeight;
  }
}
