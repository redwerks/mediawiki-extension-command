"use strict";
var ConfigStore = require('configstore'),
	pkg = require('../package.json'),
	store = new ConfigStore(pkg.name);

module.exports = store;
