/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  ,driverlogin=require('./routes/driverlogin')
  , http = require('http')
  , path = require('path');
var bodyParser=require('body-parser');
var qs = require('querystring');
var Ibc1 = require('ibm-blockchain-js');
var bcconnect=require ('./module/bcconnect');
var fs = require('fs');
var ibc=new Ibc1();

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/users', user.list);
app.get('/loginValidate',driverlogin.validate);


//blockchain setup

try{
	//this hard coded list is intentionaly left here, feel free to use it when initially starting out
	//please create your own network when you are up and running
	var manual = JSON.parse(fs.readFileSync('mycreds_bluemix.json', 'utf8'));
	//var manual = JSON.parse(fs.readFileSync('mycreds_bluemix.json', 'utf8'));
	var peers = manual.credentials.peers;
	console.log('loading hardcoded peers');
	var users = null;																			//users are only found if security is on
	if(manual.credentials.users) users = manual.credentials.users;
	console.log('loading hardcoded users');
}
catch(e){
	console.log('Error - could not find hardcoded peers/users, this is okay if running in bluemix');
}


if(process.env.VCAP_SERVICES){																	//load from vcap, search for service, 1 of the 3 should be found...
	var servicesObject = JSON.parse(process.env.VCAP_SERVICES);
	for(var i in servicesObject){
		if(i.indexOf('ibm-blockchain') >= 0){													//looks close enough
			if(servicesObject[i][0].credentials.error){
				console.log('!\n!\n! Error from Bluemix: \n', servicesObject[i][0].credentials.error, '!\n!\n');
				peers = null;
				users = null;
				process.error = {type: 'network', msg: 'Due to overwhelming demand the IBM Blockchain Network service is at maximum capacity.  Please try recreating this service at a later date.'};
			}
			if(servicesObject[i][0].credentials && servicesObject[i][0].credentials.peers){		//found the blob, copy it to 'peers'
				console.log('overwritting peers, loading from a vcap service: ', i);
				peers = servicesObject[i][0].credentials.peers;
				if(servicesObject[i][0].credentials.users){										//user field may or maynot exist, depends on if there is membership services or not for the network
					console.log('overwritting users, loading from a vcap service: ', i);
					users = servicesObject[i][0].credentials.users;
				} 
				else users = null;																//no security
				break;
			}
		}
	}
}

var options = 	{
		network:{
			peers: [{
				"api_host": "f8549f9b487e4280b67b8c55a24a872d-vp0.us.blockchain.ibm.com",
				"api_port": 5004,
				"type": "peer",
				"id": "f8549f9b487e4280b67b8c55a24a872d-vp0"
			}],																	//lets only use the first peer! since we really don't need any more than 1
			users:  [{
				"enrollId": "user_type1_0",
				"enrollSecret": "24d266f43a"
			}],													//dump the whole thing, sdk will parse for a good one
			options: {
						quiet: true, 															//detailed debug messages on/off true/false
						tls: detect_tls_or_not(peers), 											//should app to peer communication use tls?
						maxRetry: 1																//how many times should we retry register before giving up
					}
		},
		chaincode:{
			zip_url: 'https://github.com/knagware9/marbles/archive/master.zip',
			unzip_dir: 'marbles-master/chaincode',													//subdirectroy name of chaincode after unzipped
			git_url: 'https://github.com/knagware9/marbles/chaincode',
			deployed_name: 'http://f8549f9b487e4280b67b8c55a24a872d-vp0.us.blockchain.ibm.com:5004'
		}
	};

var chaincode = null;	
ibc.load(options, function (err, cc){														//parse/load chaincode, response has chaincode functions!
	if(err != null){
		console.log('! looks like an error loading the chaincode or network, app will fail\n', err);
		if(!process.error) process.error = {type: 'load', msg: err.details};				//if it already exist, keep the last error
	}
	else{
		chaincode = cc;
		bcconnect.setup(ibc, cc); //pass the cc obj to part 1 node code
	}
});

function prefer_type1_users(user_array){
	var ret = [];
	for(var i in users){
		if(users[i].enrollId.indexOf('type1') >= 0) {	//gather the type1 users
			ret.push(users[i]);
		}
	}

	if(ret.length === 0) ret = user_array;				//if no users found, just use what we have
	return ret;
}

//see if peer 0 wants tls or no tls
function detect_tls_or_not(peer_array){
	var tls = false;
	if(peer_array[0] && peer_array[0].api_port_tls){
		if(!isNaN(peer_array[0].api_port_tls)) tls = true;
	}
	return tls;
}

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
