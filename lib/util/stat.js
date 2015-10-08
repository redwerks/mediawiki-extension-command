"use strict";
var Promise = require('bluebird'),
	fs = Promise.promisifyAll(require('graceful-fs'));

['isFile', 'isDirectory'].forEach((name) => {
	exports[name] = function(path) {
		return fs.statAsync(path)
			.then((stat) => {
				return stat && stat[name]();
			})
			.catch((err) => {
				if ( err.code === 'ENOENT' ) {
					return false;
				} else {
					throw err;
				}
			});
	};
});

// ENOTDIR
// ENOTFILE
