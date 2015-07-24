var express = require('express');
var path = require('path');
var app = express();
var WebSocketServer = require('websocket').server;
var http = require('http');
var connections = []; //记录websocket在线用户
var port = 3001;
var routes = require('./routes/index');
var server = http.createServer(app);
// var server = http.createServer(function(req,res){});

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.static(__dirname + '/public'));
app.use('/', routes);

/// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

//=======启动http服务器，监听端口==========//
server.listen(port, function(){
	console.log((new Date())+'Listening on port '+ port);
});


//===========在http服务器上添加websocket服务器==========//
wsServer = new WebSocketServer({
	httpServer: server
});


function originIsAllowed(origin){
	//加入逻辑后此处可用于过滤连接源
	return true;
}

wsServer.on('request', function(request){
	if(!originIsAllowed(request.origin)){
		request.reject();
		console.log((new Date())+'Connection from origin '+request.origin+' rejected.');
		return;
	}

	var connection = request.accept(null, request.origin);
	connections.push({id:'', pseu:'', socket: connection}); //we can add more info to every object
	console.log(('Server: '+new Date()) + 'One new connection accepted.');

	connection.on('message', function(message){
		if(message.type === 'utf8'){ //accept only text
			var msg = JSON.parse(message.utf8Data);
			var caller = msg.caller;
			var callee = msg.callee;
			var pseu = msg.pseu;
			if(msg.data.type === 'join'){
				for(var ele in connections){
					//告知服务器新用户的id和pseu
					if(connections[ele].socket === connection){
						connections[ele].id = msg.caller;
						connections[ele].pseu = msg.pseu;
						console.log("Server: " + pseu + "<" + caller +"> joined circus!");
					}
					//让其他用户知道这个新用户登录了,并且让这个新用户知道所有在线用户
					else{
						var msg2old = {
							data: {
								type: 'already_joined'
							},
							caller: caller,
							callee: connections[ele].id,
							pseu: pseu
						};
						connections[ele].socket.send(JSON.stringify(msg2old));
						console.log("Server: Inform " + connections[ele].pseu + "<" + connections[ele].id +"> about " + pseu + "<" + caller +">" );

						var msg2new = {
							data: {
								type: 'already_joined'
							},
							caller: connections[ele].id,
							callee: caller,
							pseu: connections[ele].pseu
						};
						connection.send(JSON.stringify(msg2new));
						console.log("Server: Inform " + pseu + "<" + caller +"> about " + connections[ele].pseu + "<" + connections[ele].id +">" );
					}
				}
			}
			else{
				//Send a message to a specific user
				if(callee !== 'ALL') {
				    for (var i = 0; i < connections.length; i++) {
						if(connections[i].id === callee) {
					    	console.log("Server: Send message <"+ msg.data.type +"> to <" + connections[i].id + ">");
					    	connections[i].socket.send(message.utf8Data);
					   		break;
						}
				    }
				}
				else {
				    //send message to all others users except the issuer
				    console.log("Server: Dispatch message for all jokers: " + connections.length);
                    for (var i = 0;i < connections.length; i++) {
                        if(connections[i].socket !== connection) {
                            console.log("Server: Send message <" + msg.data.type + "> to <" + connections[i].id + ">");
                            connections[i].socket.send(message.utf8Data);
                        }
                    }
                    console.log("Server: Dispatch end");
				}
			}

		}
		else{
			console.log("RECEIVED OTHER:" + message.binaryData);
		}
	});

	connection.on('close', function(message){
		console.log("Server: One connection lost...");
		var leaver = null;
		for(var i=0, l=connections.length; i<l; i++){
			if(connections[i].socket === connection){
				leaver = connections[i];
				connections.splice(i, 1);
				break;
			}
		}
		var msg={
			data: {
				type: 'leave'
			},
			caller: leaver.id,
			callee: 'ALL',
			pseu: leaver.pseu
		};
		for(var ele in connections){
			connections[ele].socket.send(JSON.stringify(msg));
		}
	});


});