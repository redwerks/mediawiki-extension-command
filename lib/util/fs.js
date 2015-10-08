"use strict";
var Promise = require('bluebird'),
	fs = Promise.promisifyAll(require('graceful-fs'));

exports.loadJSON = function(path) {
	return fs.readFileAsync(path, 'utf8')
		.then(JSON.parse);
};
