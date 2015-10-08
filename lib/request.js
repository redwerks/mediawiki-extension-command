"use strict";
var Promise = require('bluebird'),
	pkg = require('../package.json'),
	request = require('request').defaults({
		headers: {
			'User-Agent': 'MediaWiki-Extension-Command/' + pkg.version
		},
		strictSSL: true
	});

module.exports = Promise.promisifyAll(request);
