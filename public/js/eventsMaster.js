define(function(require, exports, module){
	var eventsMaster = function(){
		this.events = [];
	}
	eventsMaster.prototype = {
		on: function(name, callback, context){
			this.events.push({name: name, callback: callback, ctx: context||this});
		},
		off: function(name){
			var continueToDelete = true;
	        while (continueToDelete) {
	    	    for (var i=0, l=this.events.length; i<l; i++) {
		        	if(this.events[i].name === name) {
		           	 	this.events.splice(i,1);
		           	 	continueToDelete = true;
		           	 	break;
		        	}
		        	else {
		            	continueToDelete = false;
		        	}
	            }
	        }
		},
		trigger: function(name, args){
			if(this.events){
				for(var i=0; i<this.events.length; i++){
					if(name === this.events[i].name){
						this.events[i].callback.call(this.events[i].ctx, args);
					}
				}
			}
		}
	}
	
	module.exports = eventsMaster;
});