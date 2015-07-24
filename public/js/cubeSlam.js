define(function(require, exports, module){
	var $ = window.$ = require("lib/zepto");
	var adapter = require("js/adapter");
	var cutelog = require("lib/cutelog");

	var adp = new adapter();

	var color = {title: "CUBESLAM", color: "pink"};
	var cute = new cutelog();
	cute.config(color);

	//myBar, hisBar和cube的原型
	var bar = function(args){
		this.position = {
			x: args.position.x,
			y: args.position.y
		};
		this.form = {
			w: args.form.w,
			h: args.form.h
		};
		this.speed = {
			x: args.speed.x,
			y: args.speed.y
		};
		this.direction = {
			x: args.direction.x, //0不动，-1向左，1向右
			y: args.direction.y //0不动，-1向上，1向下
		};
		this.canvas = {
			w: args.canvas.w,
			h: args.canvas.h
		}
	}
	bar.prototype = { //囧，这里其实没必要设那么多公有方法，因为变量也都是公有的。。不过感觉这样更贴近面向对象语言，易读些吧==！
		getPositionX: function () {
			return this.position.x;
		},

		getPositionY: function () {
			return this.position.y;
		},

		getWidth: function() {
			return this.form.w;
		},

		getHeight: function() {
			return this.form.h;
		},

		getSpeedX: function() {
			return this.speed.x;
		},

		getSpeedY: function() {
			return this.speed.y;
		},

		getDirectionX: function() {
			return this.direction.x;
		},

		getDirectionY: function() {
			return this.direction.y;
		},

		setPositionX: function (x) {
			this.position.x = x;
		},

		setPositionY: function (y) {
			this.position.y = y;
		},

		setWidth: function(w) {
			this.form.w = w;
		},

		setHeight: function(h) {
			this.form.h = h;
		},

		setSpeedX: function(s) {
			this.speed.x = s;
		},

		setSpeedY: function(s){
			this.speed.y = s;
		},

		setDirectionX: function(d) {
			this.direction.x = d;
		},

		setDirectionY: function(d) {
			this.direction.y = d;
		},

		createInfo: function(type){
			var info = {
				type: type,
				position: {
					x: this.getPositionX(),
					y: this.getPositionY()
				},
				form: {
					w: this.getWidth(),
					h: this.getHeight()
				},
				speed: {
					x: this.getSpeedX(),
					y: this.getSpeedY()
				},
				direction: {
					x: this.getDirectionX(),
					y: this.getDirectionY()
				}
			};
			var msg = JSON.stringify(info);
			return msg;
		},

		update: function(args){
			//深拷贝
			function deepCopy(obj, args){
				for(var k in args){
					if(typeof args[k] === "object"){
						deepCopy(obj[k], args[k]);
					}
					else{
						obj[k] = args[k];
					}
				}
			}
			deepCopy(this, args);
			return this;
		},
		//在把数据传给对方后，对方需将数据旋转180度方可正确显示BAR和CUBE的位置
		mirror: function(){
			var x = this.canvas.w - this.getPositionX() - this.getWidth();
			this.setPositionX(x);
			var y = this.canvas.h - this.getPositionY() - this.getHeight();
			this.setPositionY(y);
			this.setDirectionX(-this.getDirectionX());
			this.setDirectionY(-this.getDirectionY());
			return this;
		}
	}
	//按键事件监听与处理
	var key = {
		pressed: {},

		LEFT: 37,
		UP: 38,
		RIGHT: 39,
		DOWN: 40,

		isDown: function(keyCode) {
			return this.pressed[keyCode];
		},

		onKeydown: function(event) {
			this.pressed[event.keyCode] = true;
		},

		onKeyup: function(event) {
			delete this.pressed[event.keyCode];
		}
	};
	$(function(){
		$(document).on('keydown', function(event){
			key.onKeydown(event);
		});
		$(document).on('keyup', function(event){
			key.onKeyup(event);
		});
	});

	//cubeSlam
	var cubeSlam = function(canvas, magicChannel, callee, callback, active){
		this.myBar = null;
		this.hisBar = null;
		this.cube = null;
		this.canvas = canvas;
		this.mc = magicChannel;
		this.callee = callee;
		this.gameHandle = null;
		this.callback = callback;
		this.active = active;//判断是否是游戏主机
		this.init();
	}
	cubeSlam.prototype = {
		init: function(){
			var that = this;
			var args_myBar = {
				position: {
					x: 200,
					y: 490
				},
				form: {
					w: 100,
					h: 10
				},
				speed: {
					x: 8,
					y: 0
				},
				direction: {
					x: 0,
					y: 0
				},
				canvas: {
					w: that.canvas.width,
					h: that.canvas.height
				}
			};
			var args_hisBar = {
				position: {
					x: 200,
					y: 0
				},
				form: {
					w: 100,
					h: 10
				},
				speed: {
					x: 8,
					y: 0
				},
				direction: {
					x: 0,
					y: 0
				},
				canvas: {
					w: that.canvas.width,
					h: that.canvas.height
				}
			};
			var args_cube = {
				position: {
					x: 240,
					y: 240
				},
				form: {
					w: 20,
					h: 20
				},
				speed: {
					x: 2,
					y: 6
				},
				direction: {
					x: 1,
					y: 1
				},
				canvas: {
					w: that.canvas.width,
					h: that.canvas.height
				}
			};
			this.myBar = new bar(args_myBar);
			this.hisBar = new bar(args_hisBar);
			this.cube = new bar(args_cube);
		},
		drawRect: function(bar){
			var ctx = this.canvas.getContext('2d');
			ctx.fillStyle = 'green';
			ctx.beginPath();
			ctx.rect(bar.getPositionX(), bar.getPositionY(), bar.getWidth(), bar.getHeight());
			ctx.closePath();
			ctx.fill();
		},
		sendGameInfo: function(info, callee){
			this.mc.channels[callee].send(info);
		},
		moveBar: function(){
			this.myBar.setDirectionY(0);
			this.myBar.setDirectionX(0);
			if(key.isDown(key.LEFT)){
				if(this.myBar.getPositionX()<this.myBar.getSpeedX()){
					this.myBar.setPositionX(0);
				}
				else{
					this.myBar.setPositionX(this.myBar.getPositionX() - this.myBar.getSpeedX());
				}
				this.myBar.setDirectionX(-1);
			}
			if(key.isDown(key.RIGHT)){
				if((this.myBar.getPositionX()+this.myBar.getWidth()+this.myBar.getSpeedX()) > this.canvas.width){
					this.myBar.setPositionX(this.canvas.width-this.myBar.getWidth());
				}
				else{
					this.myBar.setPositionX(this.myBar.getPositionX()+this.myBar.getSpeedX());
				}
				this.myBar.setDirectionX(1);
			}
			this.sendGameInfo(this.myBar.createInfo("GAME_BAR"), this.callee);
		},
		moveCube: function(){
			var px = this.cube.getPositionX(),
				py = this.cube.getPositionY(),
				dx = this.cube.getDirectionX(),
				dy = this.cube.getDirectionY(),
				sx = this.cube.getSpeedX(),
				sy = this.cube.getSpeedY(),
				w = this.cube.getWidth(),
				h = this.cube.getHeight();
			//x方向运动处理
			if(dx == -1){
				if(sx>px){ //撞左墙
					this.cube.setPositionX(0);
					this.cube.setDirectionX(-dx);
				}
				else{
					this.cube.setPositionX(px+sx*dx);
				}
			}
			else if(dx == 1){
				if(sx>this.canvas.width-px-w){ //撞右墙
					this.cube.setPositionX(this.canvas.width-w)
					this.cube.setDirectionX(-dx);
				}
				else{
					this.cube.setPositionX(px+sx*dx);
				}
			}
			dx = this.cube.getDirectionX();//更新dx
			px = this.cube.getPositionX();//更新px
			//y方向运动处理
			if(dy == 1){
				if(sy>this.canvas.height-this.myBar.getHeight()-py-h && px<this.myBar.getPositionX()+this.myBar.getWidth() && px>this.myBar.getPositionX()-w){
					this.cube.setPositionY(this.canvas.height - this.myBar.getHeight()-h);
					//添加MYBAR与CUBE碰撞后对CUBE移动的影响
					this.cube.setDirectionY(-dy);
					var speedx = sx*dx + this.myBar.getDirectionX()*this.myBar.getSpeedX();
					if(speedx < 0){
						this.cube.setDirectionX(-1);
						this.cube.setSpeedX(Math.abs(speedx));
					}
					else if(speedx == 0){
						this.cube.setDirectionX(0);
						this.cube.setSpeedX(0);
					}
					else{
						this.cube.setDirectionX(1);
						this.cube.setSpeedX(speedx);
					}
				}
				else{
					this.cube.setPositionY(py+sy*dy);
				}
			}
			else if(dy == -1){
				if(sy>py-this.hisBar.getHeight() && px<this.hisBar.getPositionX()+this.hisBar.getWidth() && px>this.hisBar.getPositionX()-w){
					this.cube.setPositionY(this.hisBar.getHeight());
					//添加HISBAR与CUBE碰撞后对CUBE移动的影响
					this.cube.setDirectionY(-dy);
					var speedx = sx*dx + this.hisBar.getDirectionX()*this.hisBar.getSpeedX();
					if(speedx < 0){
						this.cube.setDirectionX(-1);
						this.cube.setSpeedX(Math.abs(speedx));
					}
					else if(speedx == 0){
						this.cube.setDirectionX(0);
						this.cube.setSpeedX(0);
					}
					else{
						this.cube.setDirectionX(1);
						this.cube.setSpeedX(speedx);
					}
				}
				else{
					this.cube.setPositionY(py+sy*dy);
				}
			}
			py = this.cube.getPositionY();//更新py
			//cube触到己方底部则宣告失败，进行计分并重置游戏
			if(py>this.canvas.height-this.myBar.getHeight()){
				var msg={
					type: "GAME_DEFEAT"
				}
				this.sendGameInfo(JSON.stringify(msg), this.callee);
				this.callback.call(this, {name: 'resetGame', magic: "defeat"});
			}
			//cube触到对方底部
			else if(py<0){
				var msg={
					type: "GAME_VICTORY"
				}
				this.sendGameInfo(JSON.stringify(msg), this.callee);
				this.callback.call(this, {name: 'resetGame', magic: "victory"});
			}

			this.sendGameInfo(this.cube.createInfo("GAME_CUBE"), this.callee);
			
		},
		clear: function(){
			var ctx = this.canvas.getContext('2d');
			ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		},
		start: function(){
			var that = this;
			var gameLoop = function() {
				that.gameHandle = adp.requestAnimationFrame(gameLoop);
				cute.log("Running game");
				that.clear();
				that.moveBar();
				if(that.active){
					that.moveCube();
				}
				that.drawRect(that.myBar);
				that.drawRect(that.hisBar);
				that.drawRect(that.cube);
				// that.sendGameInfo(that.myBar.createInfo("GAME_BAR"), that.callee);
				// that.sendGameInfo(that.cube.createInfo("GAME_CUBE"), that.callee);
			}
			gameLoop();
			//that.gameHandle = setInterval(gameLoop, 50);
		},
		stop: function(){
			var that = this;
			cute.log("Stop game");
			if(that.gameHandle){
				adp.cancelAnimationFrame(that.gameHandle);
				//clearInterval(that.gameHandle);
			}
		}
	}

	module.exports = cubeSlam;
});