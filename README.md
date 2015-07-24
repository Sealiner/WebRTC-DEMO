使用方法
============
1. 使用此应用需要安装Node。
2. 安装完后，在命令行进入文件根目录后运行npm install安装所需依赖。
3. 打开server.js文件，这只监听端口port。
4. 打开views/header.ejs，配置host与port参数，host为主机在内网中的ip地址，port与server.js中的一致。
5. 运行node server.js
6. 使用浏览器（chrome或firefox）访问host:port

----

程序简介
============
此应用只是个简单应用webrtc的原型，所以在功能方面肯定有很多细节上的bug或不完善的地方。

此应用基于WEBRTC（WEB Real-Time-Communication）技术，目前实现的功能有：
1.	视频会话
2.	小型文件传输（貌似7MB左右的文件就无法成功传输了，有待研究）
3.	聊天
4.	实时对战小游戏（这个是低端版的Cube Slam，之前GOOGLE用WEBRTC技术开发了一款实验性的游戏Cube Slam）

对于WEBRTC API的应用，参考了Github上的SonotoneJS，有兴趣的可以去下载研究下，里面对于媒体流的处理更丰富些，如暂停媒体流等，这可以帮助了解一些参数。另外它还试了下桌面分享的功能，不过这个功能貌似只能在HTTPS下才能起作用。（https://github.com/oanguenot/WebRTC-SonotoneJS）
w3c标准文档请参见：http://www.w3.org/TR/webrtc/

此程序未做媒体流优化处理，这主要会导致语音方面的一些问题，如有回声，噪声大等，有兴趣做信号处理的可以研究下。

此程序未做数据的持久化。

此程序未做穿透处理，所以只能在局域网下尝试。

-----

程序结构
=========
本程序使用seajs进行CMD模块化管理。主要有如下几个核心模块：
1. main：主模块
2. websocketConnector：websocket模块
3. magicBox：即RTCPeerConnection。
4. magicChannel：用于管理由magicBox创建的所有data channel
5. eventsMaster：事件管理模块
6. adapter：桥接器，用于兼容chrome和firefox（对于文件传送功能，只能chrome，因为文件的接受函数是用了chrome才有的API）。
7. cubeSlam：游戏模块，可在此模块修改来改变游戏的一些规则。

另外的一些辅助文件有：
1. sea.js：CMD模块管理
2. cutelog.js：这个是用来在控制台更美观地输出Log的工具，因为此程序并未使用任何适用于node的log模块，所以只可通过控制台来查看程序的执行过程，以便追踪调试。
3. zepto.js：类似JQuery的框架，由于小在移动端较为流行。
4. helper.js：同事写的一个弹框插件，直接拿来用用^^
