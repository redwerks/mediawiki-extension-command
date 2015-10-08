"use strict";
var Promise = require('bluebird'),
	util = require('util'),
	_ = require('lodash'),
	Git = require('../git');

module.exports = InstallSource;

// @todo memoize/cache some of the git responses, primarily the ones that are used by multiple git-* sources
//       same for composer data, especially the stuff in the wiki root
function InstallSource({dir, git, root, data}) {
	if ( !dir ) {
		throw new TypeError('opts.dir must be defined');
	}
	if ( !root ) {
		throw new TypeError('opts.root must be defined');
	}

	this.dir = dir;
	this.git = git || new Git(this.dir);
	this.root = root;
	this.data = data;
}

InstallSource.extend = function(name, proto) {
	function IS() {
		InstallSource.apply(this, arguments);
	}
	util.inherits(IS, this);

	['extractSource', 'checkUpdates', 'download', 'update', 'switchTo'].forEach((method) => {
		if ( proto[method] ) {
			proto[method] = Promise.method(proto[method]);
		}
	});

	_.merge(IS.prototype,
		proto,
		{
			name: name
		});

	IS.extend = InstallSource.extend;

	return IS;
};

['extractSource', 'checkUpdates', 'displayInfo', 'listInfo', 'displayUpdateInfo', 'updateInfo', 'download', 'update', 'switchTo'].forEach((method) => {
	InstallSource.prototype[method] = function() {
		throw new Error(`${method} is not implemented in ${this.name}`);
	};
});
