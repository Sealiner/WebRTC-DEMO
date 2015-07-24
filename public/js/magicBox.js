define(function(require, exports, module){
	var adapter = require("js/adapter");
	var eventsMaster = require("js/eventsMaster");
	var cutelog = require("lib/cutelog");
	
	var color = {title: "magicBox", color: "violet"};
	var cute = new cutelog();
	cute.config(color);
	
	var adp = new adapter();
	
	var magicBox = function(args){
		this.websocket = null;
		this.ID = null;
		this.stun = null;
		this.callee = null;
		this.type = null;
		this.callback = null;
		this.channel = null;
		this.magicChannel = null;
		for(var k in args){
			this[k] = args[k];
		}
		return this.init();
	}
	magicBox.prototype = {
		init: function(){
			var that = this;
			var mb = adp.RTCPeerConnection(that.stun);
			mb.onaddstream = function(event){
				cute.log("Remote stream added");
				that.callback.call(that, {name: "onRemoteMediaStarted", magic: event.stream});
			};
			mb.onnegotiationneeded = function(event){
				cute.log("On negotiation needed for this magicBox", event);
			};
			mb.onsignalingstatechange = function(event){
				var signalingState = "";
				if(event.target){
					signalingState = event.target.signalingState;
				}
				else if(event.currentTarget){
					signalingState = event.currentTarget.signalingState;
				}
				else{
					signalingState = event;
				}
				cute.log("On signaling state changes to " + signalingState + " for this magicBox", event);
			};
			mb.onicecandidate = function(event){
				if(event.candidate){
					cute.log("Get local ICE Candiate from this magicBox", event);
					cute.log("Send ICE Candiate received by this magicBox");
					var message = {
						data: {
							type: 'candidate',
							label: event.candidate.sdpMLineIndex,
							id: event.candidate.sdpMid,
							candidate: event.candidate.candidate
						},
						caller: that.type + that.ID,
						callee: that.callee
					};
					that.websocket.socket.send(JSON.stringify(message));
				}
				else{
					cute.log("No more local candidate to this magicBox", event);
					cute.log("ALL Candidates have been added to this magicBox");
				}
			};
			mb.ondatachannel = function(event){
				cute.log("Received Data Channel!");
				var args = {
					callee: that.callee,
					magicBox: mb,
					receivedChannel: event.channel,
					callback: that.callback,
					hasTask: false
				};
				that.magicChannel.config(args);
			};
			return mb;
		}
	}
	
	module.exports = magicBox;
});