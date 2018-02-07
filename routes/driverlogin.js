/**
 * http://usejsdoc.org/
 */

var bcConnect=require ('../module/bcconnect');

exports.validate=function(req, res){
	var data={
			loginusername : req.query.username
	};
	
	bcConnect.process_msg(res,data);
 // res.json("validate the driver details" + req.query.username);
};