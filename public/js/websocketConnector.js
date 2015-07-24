define(function(require, exports, module){
	var cutelog = require("lib/cutelog");
	var eventsMaster = require("js/eventsMaster");
	
	var color = {title: "WEBSOCKET", color: "green"};
	var cute = new cutelog();
	cute.config(color);

	var em = new eventsMaster();
	
	var websocketConnector=function(args){
		this.host = null;
		this.port = null;
		this.socket = null;
		this.callback = null;
		for(var k in args){
			this[k] = args[k];
		}
	}
	websocketConnector.prototype={
		subscribeEvents: function(){
			websocketEvents(this.callback);
		},
		connect: function(args){
			var that = this;
			if(!that.socket) {
				that.socket = new WebSocket("ws://" + that.host + ":" + that.port);
				that.socket.onopen = function(){
					cute.log("Channel Open");
					var msg = {
						data: {
							type: 'join'
						},
						caller: args.ID,
						callee: 'ALL',
						pseu: args.name
					};
					cute.log("Send a message ", msg);
					that.socket.send(JSON.stringify(msg));
				};

				that.socket.onmessage = function(msg){
					var message = JSON.parse(msg.data);
					if(message.data.type !== undefined){
						cute.log("Received a message of type " + message.data.type);
						em.trigger("onMessage", message);
					}
					else{
						cute.log("Unknown message type !!!", message);
					}
				};

				that.socket.onclose = function(){
					cute.log("Socket closed!");
				};

				that.socket.onerror = function(err){
					cute.log("Socket error occurred!", err);
				};
			}
		}
	}

	function websocketEvents(callback){
		em.on('onMessage', function(msg){
			switch(msg.data.type){
				case 'join':
				break;
				case 'already_joined':
					callback.call(this, {name: "onNewJoker", info: {id: msg.caller, pseu: msg.pseu}});
				break;
				case 'leave':
					callback.call(this, {name: "onRemoveJoker", info: {id: msg.caller, pseu: msg.pseu}});
				break;
				case 'offer':
					callback.call(this, {name: "onCallOffered", info: msg});
				break;
				case 'answer':
					callback.call(this, {name: "onCallAnswered", info: msg});
				break;
				case 'candidate':
					callback.call(this, {name: "onCandidateAdded", info: msg});
				break;
				case 'msg':
					callback.call(this, {name: "onMessageReceived", info: {id: msg.caller, pseu: msg.pseu, content: msg.data.content}});
				break;
				case 'bye':
					callback.call(this, {name: "onCallEnded", info: {id: msg.caller}});
				break;
				default:
				break;
			}
		}, this);
	}
	
	module.exports = websocketConnector;
});