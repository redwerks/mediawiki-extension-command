"use strict";
var _ = require('lodash');

module.exports = [
	require('./composer'),
	require('./git-tag'),
	require('./git-master'),
	require('./git-rel')
];

var map = {};

_.each(module.exports, (source) => {
	map[source.prototype.name] = source;
});

module.exports.get = function(name) {
	return map[name];
};
