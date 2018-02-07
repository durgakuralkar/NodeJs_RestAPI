
/*
 * GET users listing.
 */

exports.list = function(req, res){
	console.log("body"+req.query.username);
  res.json({ user: req.query.username, message: 'test hooray! welcome to our api!' });
};