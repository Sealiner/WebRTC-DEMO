define(function(require, exports, module){
	var $ = window.$ = require("lib/zepto");
	var adapter = require("js/adapter");
	var websocketConnector = require("js/websocketConnector");
	var eventsMaster = require("js/eventsMaster");
	var cutelog = require("lib/cutelog");
	var magicBox = require("js/magicBox");
	var magicChannel = require("js/magicChannel");
	var cubeSlam = require("js/cubeSlam");
	
	var color = {title: "MAIN", color: "black"};
	var cute = new cutelog();
	cute.config(color);
	
	var adp = new adapter(); //桥接器，用于兼容chrome和firefox，文件传送目前只支持chrome
	var mc = new magicChannel(); //创建一个dataChannel大环境，里面可通过magicBox架设起许多dataChannel

//==============压入事件==============//
	var _em = new eventsMaster();
	_em.on("onNewJoker", addJoker, this);
	_em.on("onRemoveJoker", removeJoker, this);
	_em.on("onLocalMediaStarted", onLocalMediaStarted, this);
	_em.on("onRemoteMediaStarted", onRemoteMediaStarted, this);
	_em.on("onCallOffered", onCallOffered, this);
	_em.on("onCallAnswered", onCallAnswered, this);
	_em.on("onCandidateAdded", onCandidateAdded, this);
	_em.on("onCallEnded", onCallEnded, this);
	_em.on("sendFile", sendFile, this);
	_em.on("onFileReceived", onFileReceived, this);
	_em.on("inviteGame", inviteGame, this);
	_em.on("startGame", startGame, this);
	_em.on("dealInvite", dealInvite, this);
	_em.on("exitGame", exitGame, this);
	_em.on("updateBar", updateBar, this);
	_em.on("updateCube", updateCube, this);
	_em.on("resetGame", resetGame, this);
	_em.on("onMessageReceived", onMessageReceived, this);

//=========Joker~~~~==========//
	var Joker = function(){
		this.ID = new Date().getTime().toString();
		this.name = null;
		this.websocket = null;
		this.boxes = {}; //收藏Joker的所有magicBox
		this.streamVideo = null; //记录Joker当前的本地视频流
		this.onVideoJokers = []; //记录目前所有正在与Joker视频的其他Joker
		this.onGameJoker = null;//记录游戏对手的id
		this.currentGame = null; //目前玩的游戏
		this.initiator = false; //是否是游戏发起人(即是否将作为主机)
	}
	Joker.prototype = {
		config: function(args){
			var that = this;
			that.name = args.name;
			//连接websocket服务器
			var profile = {
				ID: that.ID,
				name: that.name
			};
			that.websocket = new websocketConnector({
				host: APP.INFO.host,
				port: APP.INFO.port,
				callback: function(args){
					_em.trigger(args.name, args.info);
				}
			});
			that.websocket.subscribeEvents();
			that.websocket.connect(profile);
		},
		createMagicBox: function(stun, callee, type, mChannel){
			//创建相应类型的magicBox，即RTCPeerConnection
			var that = this;
			that.boxes[type+callee] = new magicBox({
				websocket: that.websocket,
				ID: that.ID,
				stun: stun,
				callee: callee,
				type: type,
				magicChannel: mChannel,
				callback: function(args){
					_em.trigger(args.name, args.magic);
				}
			});
		},
		startVideo: function(constraints){
			var that = this;
			adp.getUserMedia(
				constraints,
				//success callback
				function(stream){
					that.streamVideo = stream;
					cute.log("getUserMeida success!");
					_em.trigger("onLocalMediaStarted", stream);
				},
				//error callback
				function(err){
					cute.log("Error occured when getUserMeida..");
				},
				that
			);
		},
		makeCall: function(callee){
			var that = this;
			that.createMagicBox(APP.STUN, callee, "v", mc);
			if(that.streamVideo){
				var streams = that.boxes["v"+callee].getLocalStreams(),
					alreadyAdded = false;
				for(var i=0; i<streams.length; i++) {
					if(streams[i].id === that.streamVideo.id) {
						alreadyAdded = true;
						break;
					}
				}
				if(!alreadyAdded) {
					cute.log("Attach a stream to the magicBox");
					that.boxes["v"+callee].addStream(that.streamVideo);
				}
				else {
					cute.log("Stream already added to the magicBox.");
				}
				that.boxes["v"+callee].createOffer(function(offerSDP){
					that.boxes["v"+callee].setLocalDescription(offerSDP, function() {
						cute.log("Set local SDP success.");
						var event = {
							data: offerSDP,
							caller: "v"+that.ID,
							callee: callee
						};   
						that.websocket.socket.send(JSON.stringify(event));
						cute.log("Send offerSDP", event);
					}, function(error){
						cute.log("setLocalDescription error!");
					});
				}, function(error){
					cute.log("createOffer error!");
				});
			}
			else{
				cute.log("No stream to add to the magicBox..");
			}
		},
		makeAnswer: function(info){
			var that = this;
			that.createMagicBox(APP.STUN, info.caller.substring(1), info.caller.substring(0,1), mc);
			that.boxes[info.caller].setRemoteDescription(adp.RTCSessionDescription(info.data));
			cute.log("Set remote SDP success");
			if(that.streamVideo){
				var streams = that.boxes[info.caller].getLocalStreams(),
					alreadyAdded = false;
				for(var i=0; i<streams.length; i++) {
					if(streams[i].id === that.streamVideo.id) {
						alreadyAdded = true;
						break;
					}
				}
				if(!alreadyAdded) {
					cute.log("Attach a stream to the magicBox");
					that.boxes[info.caller].addStream(that.streamVideo);
				}
				else {
					cute.log("Stream already added to the magicBox.");
				}
			}
			that.boxes[info.caller].createAnswer(function(answerSDP) {
				that.boxes[info.caller].setLocalDescription(answerSDP, function() {
					var event = {
			   			data: answerSDP,
			    		caller: info.caller.substring(0,1)+that.ID,
			    		callee: info.caller.substring(1)
					};   
					that.websocket.socket.send(JSON.stringify(event));
					cute.log("Send answer", event);
				}, function(error){
					cute.log("setLocalDescription error!");
				});
			},function(error){
				cute.log("createAnswer error!");
			});
		},
		stopVideoCall: function(callee){
			var that = this;
			if(that.streamVideo){
				that.streamVideo.stop();
			}
			var event = {
				data: {
					type: 'bye'
				},
				caller: that.ID,
				callee: callee
			};
			that.websocket.socket.send(JSON.stringify(event));
		},
		makeDataCall: function(callee, task){
			var that = this;
			that.createMagicBox(APP.STUN, callee, "d", mc);
			var args = {
				callee: callee,
				magicBox: that.boxes["d"+callee],
				callback: function(args){
					_em.trigger(args.name, args.magic);
				},
				hasTask: task,
				receivedChannel: null
			}
			
			mc.config(args); //配置并创建一条dataChannel

			that.boxes["d"+callee].createOffer(function(offerSDP) {
				that.boxes["d"+callee].setLocalDescription(offerSDP, function() {

					cute.log("Set local SDP success.");
					var event = {
			 	  		data: offerSDP,
			   	   		caller: "d"+that.ID,
				    	callee: callee
					};   
					that.websocket.socket.send(JSON.stringify(event));
					cute.log("Send offerSDP", event);
				}, function(error){
					cute.log("setLocalDescription error!");
				});
			}, function(error){
				cute.log("createOffer error!");
			});
		},
		sendFile: function(file, callee){
			var that = this;
			var reader = new FileReader();
			var msg = {
				type: "FILE_START",
				content: {
					fileName: file.name,
					size: file.size,
					type: file.type
				}
			};
			cute.log("Send file to joker <" + callee + ">");
			mc.channels[callee].send(JSON.stringify(msg));
			reader.onload = function(file) {
				if(reader.readyState === FileReader.DONE) {
					mc.sendBlob(new Blob([file.target.result]), callee);
				}
			};

			reader.readAsArrayBuffer(file);
		}
		
	}

	cute.log("初始化Joker...");
	var joker = new Joker();
	joker.config(APP.INFO); //设置joker的ID与name，然后加入circus(即连接websocket服务器)
	
	
//============声明各回调函数==============//	
	function addJoker(jo){
		var TPL = '<li>\
					<input type="checkbox" id=' + jo.id + '>\
					<label for=' + jo.id + '>' + jo.pseu + '</label>\
				  </li>';
				  
		$("#userList").append(TPL);
		APP.JOKERS.push(jo.id);
		cute.log(jo.pseu + "<" + jo.id + "> joined the circus");
	}

	function removeJoker(jo){
		$("#"+jo.id).parent().remove();
		for(var i=0, l=APP.JOKERS.length; i<l; i++){
			if(jo.id === APP.JOKERS[i]){
				APP.JOKERS.splice(i, 1);
				break;
			}
		}
		cute.log(jo.pseu + "<" + jo.id + "> leaved the circus");
	}

	function onLocalMediaStarted(stream){
		cute.log("Local media started!");
		adp.attachToMedia($("#localVideo")[0], stream);
	}

	function onRemoteMediaStarted(stream){
		cute.log("Remote media started!");
		adp.attachToMedia($("#remoteVideo")[0], stream);
	}
	
	function onCallOffered(info){
		cute.log("ON CALL OFFERED", info);
		joker.makeAnswer(info);
	}

	function onCallAnswered(info){
		cute.log("ON CALL ANSWERED", info);
		joker.boxes[info.caller].setRemoteDescription(adp.RTCSessionDescription(info.data));
	}

	function onCandidateAdded(info){
		cute.log("Add ICE Candidate to the corresponding magicBox.");
		var candidate = adp.RTCIceCandidate({sdpMLineIndex:info.data.label, candidate:info.data.candidate, id:info.data.id});
		joker.boxes[info.caller].addIceCandidate(candidate);
	}

	function onCallEnded(info){
		cute.log("ON CALL ENDED");
		adp.detachToMedia($("#remoteVideo")[0]);
	}

	function sendFile(callee){
		cute.log("Send file...");
		var fileList = fileElt.files;
		joker.sendFile(fileList[0], callee);
	}

	function onFileReceived(file) {   
		cute.log("Received a file", file);

		navigator.webkitPersistentStorage.requestQuota(10*1024*1024, function(grantedBytes){

            window.webkitRequestFileSystem(window.TEMPORARY, grantedBytes, function(fs) {
    
              	fs.root.getFile(file.info.fileName, {create: true}, function(fileEntry) {
                	    
                	fileEntry.createWriter(function(fileWriter) {

                  		fileWriter.seek(fileWriter.length); // Start write position at EOF.

                  		fileWriter.write(file.content);

                  		var link = document.createElement('a');
                  		link.href = fileEntry.toURL();
                 		link.target = '_blank';
                  		link.download = file.info.fileName;
                  		link.innerHTML = file.info.fileName;

                  		$('#fileList').append(link);

                	}, function(e) {
                  		cute.log("DEMO :: Error1", e);
                	});

                }, function(ee) {
                	cute.log("DEMO :: Error2", ee);
                });

            }, function(eee){
              	cute.log("DEMO :: Error3", eee);
            });   
        }, function(eeee) {
            cute.log("DEMO :: Error4", eeee);
        });	
	}

	function inviteGame(callee){
		var msg = {
			type: "GAME_INVITE",
			caller: joker.ID,
			callee: callee,
			pseu: joker.name
		};
		mc.channels[callee].send(JSON.stringify(msg));
		$('#game_status').text("已邀请玩家，请耐心等待。。。");
	}

	function dealInvite(args){
		if(!$("#game_page").hasClass('on')){
			var str = args.pseu+"邀请你加入游戏！";
			$.confirm = function(str){
				confirm(str, {
					TPL:'<div class="widget_wrap" style="z-index:{zIndex};">\
						<div class="widget_header"></div>\
						<div class="widget_body">{str}</div>\
						<div class="widget_footer">\
							<ul>\
								<li><a href="javascript:;" type="button" data-button="0">'+('拒绝')+'</a></li>\
								<li><a href="javascript:;" type="button" data-button="1">'+('接受')+'</a></li>\
							</ul>\
						</div>\
						</div>',
					callBack: function(evt){
						var that = this,ele = null, dataButton = null;
						if(evt && (ele = evt.target) && (dataButton = ele.getAttribute("data-button")) ){
							if("1"==dataButton){
								$("#main_page").removeClass("on");
								$("#game_page").addClass("on");
								joker.onGameJoker = args.caller; //设置当前游戏对手
								$('.player_score').text(0);
								$('.my_info .player_name').text(joker.name);
								$('.opponent_info .player_name').text(args.pseu);
								var msg = {
									type: "GAME_ACCEPT",
									caller: joker.ID,
									callee: args.caller,
									pseu: joker.name
								};
								mc.channels[args.caller].send(JSON.stringify(msg));
								startGame(args.caller);
							}
							else{
								var msg = {
									type: "GAME_REFUSE",
									caller: joker.ID,
									callee: args.caller,
									pseu: joker.name
								};
								mc.channels[args.caller].send(JSON.stringify(msg));
							}
							that.destroy();
						}
						return false;
					}
				});
			}
			$.confirm(str);
		}
	}

	function startGame(callee){
		var callback = function(args){
			_em.trigger(args.name, args.magic);
		}
		var count = 3;
		var handler = setInterval(function(){
			if(joker.onGameJoker === null){
				clearInterval(handler);
			}
			else{
				if(count == 0){
					$('#game_status').text("GO!");
					var canvas = $("#gameCanvas")[0];
					joker.currentGame = new cubeSlam(canvas, mc, callee, callback, joker.initiator);
					joker.currentGame.start();
					clearInterval(handler);
				}
				else{
					$('#game_status').text(count);
					count--;
				}
			}
		},1000);
	}

	function exitGame(args){
		$('#game_status').text(args.pseu+"退出了游戏！");
		joker.onGameJoker = null;
		if(joker.currentGame){
			joker.currentGame.stop();
		}
	}

	function updateBar(args){
		joker.currentGame.hisBar.update(args).mirror();
	}

	function updateCube(args){
		joker.currentGame.cube.update(args).mirror();
	}

	function resetGame(args){
		cute.log("resetGame");
		joker.currentGame.stop();
		joker.currentGame.init();
		joker.currentGame.clear();
		joker.currentGame.drawRect(joker.currentGame.myBar);
		joker.currentGame.drawRect(joker.currentGame.hisBar);
		joker.currentGame.drawRect(joker.currentGame.cube);
		if(args === "defeat"){
			$(".opponent_info .player_score").text(parseInt($(".opponent_info .player_score").text())+1);
		}
		else if(args === "victory"){
			$(".my_info .player_score").text(parseInt($(".my_info .player_score").text())+1);
		}
		startGame(joker.onGameJoker);
	}

	function onMessageReceived(args){
		var str = '<label>'+args.pseu+"：" +'</label>'+args.content+'<br>';
		$(".show_msg")[0].innerHTML+= str;
	}
//==============绑定按钮触发事件================//	
	$(function(){
		$("#startVideo").on("click", function(){
			var constraints = {
				video: true,
				audio: true  
	    	};
			joker.startVideo(constraints);
		});
		$("#callVideo").on("click", function(){
			if(APP.JOKERS.length>0){
				cute.log("Try to make a video call");
				$("#userList").find("input[type='checkbox']").each(function(){
					if($(this)[0].checked){
						joker.onVideoJokers.push($(this)[0].id);
						joker.makeCall($(this)[0].id);
					}
				});
			}
			else{
				cute.log("No joker in the circus..");
			}
		});
		$("#stopVideo").on("click", function(){
			cute.log("Stop video!");
			adp.detachToMedia($("#localVideo")[0]);
			adp.detachToMedia($("#remoteVideo")[0]);
			for(var i=0; i<joker.onVideoJokers.length; i++){
				joker.stopVideoCall(joker.onVideoJokers[i]);
			}
			joker.onVideoJokers = [];

		});
		$("#joinGame").on("click", function(){
			if(APP.JOKERS.length>0){
				var jokers = $("#userList").find("input[type='checkbox']");
				var selected = false;
				for(var i=0; i<jokers.length; i++){
					if(jokers[i].checked){
						selected = true;
						cute.log("Enter game room");
						$("#main_page").removeClass("on");
						$("#game_page").addClass("on");
						var jokerName = $(jokers[i]).next().text();
						cute.log("Try to establish datachannel with "+ jokerName);
						joker.onGameJoker = jokers[i].id; //设置当前游戏对手
						joker.initiator = true; //设为游戏主机
						$('.player_score').text(0);
						$('.my_info .player_name').text(joker.name);
						$('.opponent_info .player_name').text(jokerName);
						joker.makeDataCall(jokers[i].id, "game");
						break;
					}
				}
				if(!selected){
					alert("请先选择一个用户");
				}
			}
			else{
				alert("目前尚无其他在线用户，无法进行游戏 :(");
				cute.log("No joker in the circus..");
			}
		});
		$("#exitGame").on("click", function(){
			cute.log("Exit game room");
			$("#game_page").removeClass("on");
			$("#main_page").addClass("on");
			if(joker.currentGame){
				joker.currentGame.stop();
			}
			var msg = {
				type: "GAME_EXIT",
				caller: joker.ID,
				callee: joker.onGameJoker,
				pseu: joker.name
			};
			mc.channels[joker.onGameJoker].send(JSON.stringify(msg));
			joker.onGameJoker = null;
			joker.initiator = false;
		});
		$("#sendFile").on("click", function(){
			if(APP.JOKERS.length>0){
				cute.log("Waiting dataChannel to send file...");
				$("#userList").find("input[type='checkbox']").each(function(){
					if($(this)[0].checked){
						joker.makeDataCall($(this)[0].id, "file");
					}
				});
			}
			else{
				cute.log("No joker in the circus..");
			}
			
		});
		$("#sendMsg").on("click",function(){
			cute.log("Send a text message to all users");
			var message = $('#message').val();
			var msg = {
				data: {
					type: 'msg',
					content: message
				},
				caller: joker.ID,
				callee: 'ALL',
				pseu: joker.name
			}
			joker.websocket.socket.send(JSON.stringify(msg));
			$('#message').val("");
			var str = '<label>'+joker.name+"：" +'</label>' + message+'<br>';
			$(".show_msg")[0].innerHTML+= str;
		});

	});

});