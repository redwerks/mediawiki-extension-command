"use strict";
var _ = require('lodash');

module.exports = function(message, props={}) {
	var err = new Error(message);

	if ( typeof props === 'string' ) {
		props = {
			code: props
		};
	}

	_.merge(err, props);

	throw err;
};
