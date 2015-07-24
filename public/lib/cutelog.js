define(function(require, exports, module){
	
	var cutelog = function(){
		this.title = "clog";
		this.color = "black";
		this.titleLength = 12;
	}
	cutelog.prototype = {
		config: function(args){
			for(var k in args){
				this[k] = args[k];
			}
		},
		log: function(msg, arg){
			var that = this;
			var time = new Date();

			var displayTitle = that.title.substring(0, that.titleLength);
			while(displayTitle.length < that.titleLength){
				displayTitle += ' ';
			}

			if(arg !== undefined){
				console.log("%c|'O~O'| " + time.toLocaleTimeString() + ":" + time.getMilliseconds() + " [" + displayTitle + "] - " + msg + " | %O", "color:" + that.color, arg);
			}
			else{
				console.log("%c|'O~O'| " + time.toLocaleTimeString() + ":" + time.getMilliseconds() + " [" + displayTitle + "] - " + msg, "color:" + that.color);
			}
			

		}

	}

	module.exports = cutelog;

});