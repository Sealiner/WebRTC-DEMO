define(function(require, exports, module){
	var $ = window.$ = require("lib/zepto");
	var adapter = require("js/adapter");
	var eventsMaster = require("js/eventsMaster");
	var cutelog = require("lib/cutelog");
	
	var color = {title: "magicChannel", color: "blue"};
	var cute = new cutelog();
	cute.config(color);
	
	var adp = new adapter();
	
	var magicChannel = function(){
		this.callee = null;
		this.magicBox = null;
		this.receivedChannel = null;
		this.channels = {};
		this.callback = null;
		this.fileInfo = null; //用于保存文件信息
		this.file = []; //用于保存各文件片段
		this.remainingBlob = null; //剩余待发送的文件片段
		this.hasTask = null; //判断在dataChannel成功创建后有何种任务需要执行
	}
	magicChannel.prototype = {
		config: function(args){
			var that = this;
			for(var k in args){
				that[k] = args[k];
			}

			if(!that.receivedChannel){
				cute.log("Create dataChannel....");
				that.channels[that.callee] = that.magicBox.createDataChannel(that.callee, null);//参数(id of channel, dataChannelOptions)，这里的第二个参数可用于设置可靠或不可靠模式，类似TCP/UDP，是SCTP
			}
			else{
				cute.log("Use existing channel received from <" + that.callee + ">");
				that.channels[that.callee] = that.receivedChannel;
			}

			that.channels[that.callee].onopen = function(){
				cute.log("DataChannel is successfully opened for joker<" + that.callee + ">");
				if(that.hasTask === "file"){
					that.callback.call(that, {name: "sendFile", magic: that.callee});
				}
				if(that.hasTask === "game"){
					that.callback.call(that, {name: "inviteGame", magic: that.callee});
				}
			};

			that.channels[that.callee].onerror = function(e){
				cute.log("DataChannel error for joker<" + that.callee + ">");
			};

			that.channels[that.callee].onclose = function(e){
				cute.log("DataChannel closed for joker<" + that.callee + ">");
			};

			that.channels[that.callee].onmessage = function(e){
				cute.log("DataChannel received a message!");
				var ack = {
					type: "FILE_ACK"
				};
				if(e.data instanceof ArrayBuffer){
					var blob = new Blob([e.data], {type: that.fileInfo.type});
					that.file.push(blob);
					that.channels[that.callee].send(JSON.stringify(ack));
				}
				else if(e.data instanceof Blob){
					that.file.push(e.data);
					that.channels[that.callee].send(JSON.stringify(ack));
				}
				else{
					try{
						if(e.data.indexOf('{') === 0){
							var jsonMessage = JSON.parse(e.data);
							switch(jsonMessage.type){
								case "FILE_START":
									cute.log("Start receiving file", jsonMessage.content);
									that.file= [];
									that.fileInfo = jsonMessage.content;
									break;
								case "FILE_END":
									var fullFile = new Blob(that.file);
									cute.log("End receiving file");
									var filemsg = {
										info: that.fileInfo,
										content: fullFile
									};
									that.callback.call(that, {name: 'onFileReceived', magic: filemsg});
									break;
								case "FILE_ACK":
									if(that.remainingBlob.size) {
                                    	that.sendBlob(that.remainingBlob);
                               		}
                                	else {
                                    	cute.log("No more part to send");
                                     	var msg = {
                                        	type: "FILE_END"
                                    	};
                                    	that.channels[that.callee].send(JSON.stringify(msg));
                                	}
									break;
								case "GAME_INVITE":
									cute.log("Game invite");
									that.callback.call(that, {name: 'dealInvite', magic: {caller: jsonMessage.caller, pseu: jsonMessage.pseu}});
								break;
								case "GAME_REFUSE":
									cute.log("Game refuse");
									$('#game_status').text("对方拒绝了你的邀请，退出游戏后可尝试重新邀请");
								break;
								case "GAME_ACCEPT":
									cute.log("Game accept");
									$('#game_status').text("对方接受了你的邀请，游戏马上开始!");
									that.callback.call(that, {name: 'startGame', magic: jsonMessage.caller});
								break;
								case "GAME_EXIT":
									cute.log("Game exit");
									that.callback.call(that, {name: 'exitGame', magic: {caller: jsonMessage.caller, pseu: jsonMessage.pseu}});
								break;
								case "GAME_BAR":
									cute.log("update bar");
									that.callback.call(that, {name: 'updateBar', magic: jsonMessage});
								break;
								case "GAME_CUBE":
									cute.log("update cube");
									that.callback.call(that, {name: 'updateCube', magic: jsonMessage});
								break;
								case "GAME_DEFEAT":
									cute.log("Victory!");
									that.callback.call(that, {name: 'resetGame', magic: "victory"});
								break;
								case "GAME_VICTORY":
									cute.log("Defeat!");
									that.callback.call(that, {name: 'resetGame', magic: "defeat"});
								break;
								default:
								break;
							}
						}
					}
					catch(err){
						console.error(err);
					}
				}				
			};
		},
		sendBlob: function(blob){
			var that = this;
			var toSend = null,
            	chunkLength = 64000,  //62KB
            	fr = new FileReader();

        	if (blob.size > chunkLength) {
            	toSend = blob.slice(0, chunkLength);
        	}
        	else {
          		toSend = blob;
        	}

       		fr.onload = function() {
            	that.remainingBlob = blob.slice(toSend.size);
            	that.channels[that.callee].send(this.result);
        	};
        
        	fr.readAsArrayBuffer(toSend);
		}
	}

	module.exports = magicChannel;
	
});