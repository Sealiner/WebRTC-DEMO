define(function(require, exports, module){
	
	var adapter = function(){
		this.isFirefox = false;
		this.isChrome = false;
		this.init();
	}
	adapter.prototype = {
		init: function(){
			if(navigator.mozGetUserMedia && window.mozRTCPeerConnection){
				this.isFirefox = true;
			}
			else if(navigator.webkitGetUserMedia && window.webkitRTCPeerConnection){
				this.isChrome = true;
			}
			else{
				alert("请使用Chrome或firefox浏览器！");
			}
		},
		RTCPeerConnection : function(stun){
			if(this.isChrome){
				return new window.webkitRTCPeerConnection(stun);

			} 
			else if(this.isFirefox){
				return new window.mozRTCPeerConnection(stun);
			}
		},
		RTCSessionDescription : function (sdp) {
			if(this.isChrome) {
				return new window.RTCSessionDescription(sdp);
			}
			else if(this.isFirefox) {
				return new window.mozRTCSessionDescription(sdp);
			}
		},
		RTCIceCandidate: function (candidate) {
			if(this.isChrome) {
				return new window.RTCIceCandidate(candidate);
			} 
			else if(this.isFirefox) {
				return new window.mozRTCIceCandidate(candidate);
			}	
		},
		getUserMedia : function(constraints, callback, errCallback, context){
			if(this.isChrome){
				return navigator.webkitGetUserMedia.bind(navigator).call(context, constraints, callback, errCallback);
			}
			else if(this.isFirefox){
				return navigator.mozGetUserMedia.bind(navigator).call(context, constraints, callback, errCallback);
			}
		},
		attachToMedia: function(element, stream) {
			if(this.isChrome) {
				if (typeof element.srcObject !== 'undefined') {
                	element.srcObject = stream;
            	} else if (typeof element.mozSrcObject !== 'undefined') {
               		element.mozSrcObject = stream;
           		} else if (typeof element.src !== 'undefined') {
                	element.src = window.URL.createObjectURL(stream);
           		}
			}
			else if(this.isFirefox) {
				element.mozSrcObject = stream;
            	element.play();
			}
		},
		detachToMedia: function(element) {
			if(this.isChrome) {			
                element.src = '';
			}
			else if(this.isFirefox) {
				element.mozSrcObject = null;
			}
		},
		requestAnimationFrame: function(loop){
			if(this.isChrome){
				return window.webkitRequestAnimationFrame(loop);
			}
			else if(this.isFirefox){
				return window.mozRequestAnimationFrame(loop);
			}
		},
		cancelAnimationFrame: function(handle){
			if(this.isChrome) {
				return window.webkitCancelAnimationFrame(handle);
			}
			else if(this.isFirefox) {
				return window.mozCancelAnimationFrame(handle);
			}
		}
	}

	module.exports = adapter;
});