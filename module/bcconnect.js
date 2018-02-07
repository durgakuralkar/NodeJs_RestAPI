var ibc = {};
var chaincode = {};


module.exports.setup = function(sdk, cc){
	ibc = sdk;
	chaincode = cc;
};

module.exports.process_msg = function(res,data){
	console.log("data.loginusername"+data.loginusername);
	chaincode.query.read([data.loginusername], cb_got_login);
}

function cb_got_login(e, loginuserfromcc) {
	if(e != null) {
		console.log('[ws error] did not get driver:', e);
		//sendMsg({msg: 'checklogin', e: e, authentication:'failure'});
		
	}
	else{
		var jsondriver = JSON.parse(loginuserfromcc);
		console.log('Driver details received ' + jsondriver);
		res.json(JSON.stringify(jsondriver));
	}
}