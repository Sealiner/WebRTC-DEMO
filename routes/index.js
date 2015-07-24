var express = require('express');
var bodyParser = require('body-parser');
var router = express.Router();

router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

router.get('/', function(req, res){
	res.render('index', {
		title: 'WebRTC APP'
	});
});
// router.get('/index2', function(req, res){
// 	res.render('index2', {
// 		title: 'WebRTC APP'
// 	});
// });
router.post('/panel', function(req, res){
	var user = req.param('login_username');
	res.render('panel', {
		title: 'WebRTC APP',
		userName: user
 	});
});

module.exports = router;