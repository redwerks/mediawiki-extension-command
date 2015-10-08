"use strict";
var _ = require('lodash'),
	api = require('./api');

module.exports = RemoteExtension

function RemoteExtension() {

}

RemoteExtension.get = function(name) {
	return api.get(`/extension/${name}`)
		.then((data) => {
			var ext = new RemoteExtension();
			_.merge(ext, data);
			return ext;
		});
};
