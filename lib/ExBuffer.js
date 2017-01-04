/*!
 * ExBuffer TCP中的粘包、分包问题的解决方案！
 *
 * @update 包结构支持TLV格式 --by xp
 */

const util = require('util');
const EventEmitter = require('events');

/*
* 构造方法
* @param bufferLength 缓存区长度，默认512 byte
*/
var ExBuffer = function (bufferLength) {
    EventEmitter.call(this); //继承事件类

    var self = this;
    var _headLen = 2;
    var _endian = 'B';
    var _buffer = new Buffer(bufferLength || 512); //Buffer大于8kb 会使用slowBuffer，效率低
    var _readOffset = 0;
    var _putOffset = 0;
    var _dlen = 0;
    var _tagLen = 0;
    var _tag = 0;

   /*
    * 指定指令Tag长是int8型即占1个字节(默认不包含tag结构)
    */
    this.int8Tag = function(){
        _tagLen = 1;
        return this;
    };

   /*
    * 指定包长是uint32型(默认是ushort型)
    */
    this.uint32Head = function(){
        _headLen = 4;
        return this;
    };

   /*
    * 指定包长是ushort型(默认是ushort型)
    */
    this.ushortHead = function(){
        _headLen = 2;
        return this;
    };

   /*
    * 指定字节序 为Little Endian (默认：Big Endian)
    */
    this.littleEndian = function(){
       _endian = 'L';
        return this;
    };

   /*
    * 指定字节序 为Big Endian (默认：Big Endian)
    */
    this.bigEndian = function(){
       _endian = 'B';
       return this;
    };

   /*
    * 送入一端Buffer
    */
    this.put = function(buffer,offset,len){
        if(offset == undefined)offset = 0;
        if(len == undefined)len = buffer.length - offset;
        //buf.copy(targetBuffer, [targetStart], [sourceStart], [sourceEnd])
        //当前缓冲区已经不能满足次数数据了
        if(len + getLen() > _buffer.length){
            var ex = Math.ceil((len + getLen())/(1024));//每次扩展1kb
            var tmp = new Buffer(ex * 1024);
            var exlen = tmp.length - _buffer.length;
            _buffer.copy(tmp);
            //fix bug : superzheng
            if (_putOffset < _readOffset) {
                if (_putOffset <= exlen) {
                    tmp.copy(tmp, _buffer.length, 0, _putOffset);
                    _putOffset += _buffer.length;
                } else {
                    //fix bug : superzheng
                    tmp.copy(tmp, _buffer.length, 0, exlen);
                    tmp.copy(tmp, 0, exlen, _putOffset);
                    _putOffset -= exlen;
                }
            }
            _buffer = tmp;
        }
        if(getLen() == 0){
            _putOffset = _readOffset = 0;
        }
        //判断是否会冲破_buffer尾部
        if((_putOffset + len) > _buffer.length){
            //分两次存 一部分存在数据后面 一部分存在数据前面
            var len1 = _buffer.length - _putOffset;
            if (len1 > 0) {
                buffer.copy(_buffer,_putOffset,offset,offset + len1);
                offset += len1;
            }

            var len2 = len - len1;
            buffer.copy(_buffer,0,offset,offset + len2);
            _putOffset = len2;
        }else{
            buffer.copy(_buffer,_putOffset,offset,offset + len);
            _putOffset += len;
        }
        proc();
    };

    function proc() {
        var count = 0;
        while(true){
            //console.log('_readOffset:'+_readOffset);
            //console.log('_putOffset:'+_putOffset);
            //console.log(_buffer);
            count++;
            if(count>1000)break;//1000次还没读完??
            if(_dlen == 0){
                if(getLen() < (_headLen + _tagLen)){
                    break;//连包头都读不了
                }
                if(_buffer.length - _readOffset >= (_headLen + _tagLen)){
                    if (_tagLen > 0){
                      if (_tagLen == 1){
                        _tag = _buffer['readInt8'](_readOffset);
                      } else {
                        _tag = _buffer['readInt' + (8*_tagLen) + ''+ _endian +'E'](_readOffset);
                      }
                    }
                    _readOffset += _tagLen;
                    _dlen = _buffer['readUInt' + (8*_headLen) + ''+ _endian +'E'](_readOffset);
                    _readOffset += _headLen;
                }else {//
                    var hbuf = new Buffer(_headLen + _tagLen);
                    var rlen = 0;
                    for(var i = 0;i<(_buffer.length + _tagLen - _readOffset);i++){
                        hbuf[i] = _buffer[_readOffset++];
                        rlen++;
                    }
                    _readOffset = 0;
                    for(var i = 0;i<(_headLen + _tagLen - rlen);i++){
                        hbuf[rlen+i] = _buffer[_readOffset++];
                    }
                    if (_tagLen > 0){
                      if (_tagLen == 1){
                        _tag = hbuf['readInt8'](0);
                      } else {
                        _tag = hbuf['readInt' + (8*_tagLen) + ''+ _endian +'E'](0);
                      }
                    }
                    _dlen = hbuf['readUInt' + (8*_headLen) + ''+ _endian +'E'](_tagLen);
                }
            }

            //console.log('_dlen:'+_dlen + ',unreadLen:'+getLen());

            if(getLen() >= _dlen){
                var dbuff = new Buffer(_dlen);
                if(_readOffset + _dlen > _buffer.length){
                    var len1 = _buffer.length - _readOffset;
                    if (len1 > 0) {
                        _buffer.copy(dbuff,0,_readOffset,_readOffset + len1);
                    }

                    _readOffset = 0;
                    var len2 = _dlen - len1;
                    _buffer.copy(dbuff,len1,_readOffset,_readOffset += len2);
                }else {
                    _buffer.copy(dbuff,0,_readOffset,_readOffset += _dlen);
                }
                try {
                    _dlen = 0;
                    if (_tagLen > 0){
                      //_tagLen = 0;
                      self.emit("data", {tag:_tag, value:dbuff});
                    } else {
                      self.emit("data", dbuff);
                    }

                    if (_readOffset === _putOffset) {
                        break;
                    }
                } catch(e) {
                    self.emit("error", e);
                }
            }else {
                break;
            }
        }
    }

    //获取现在的数据长度
    function getLen() {
        if(_putOffset>= _readOffset){
            return _putOffset -  _readOffset;
        }
        return _buffer.length - _readOffset + _putOffset;
    }
};

util.inherits(ExBuffer, EventEmitter);//继承事件类

module.exports = exports = ExBuffer;
