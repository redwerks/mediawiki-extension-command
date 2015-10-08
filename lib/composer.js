"use strict";
var Promise = require('bluebird'),
	_ = require('lodash'),
	child_process = Promise.promisifyAll(require('child_process')),
	conf = require('./configstore'),
	externalCommands = require('./external-commands'),
	php = _.memoize(() => externalCommands.findPHP()),
	composer = _.memoize(() => externalCommands.findComposer());

module.exports = function(args, {cwd}) {
	return Promise.join(php(), composer())
		.spread((php, composer) => {
			return new Promise(function(resolve, reject) {
				try {
					var child = child_process.spawn(php, [composer, ...args], {
						cwd: cwd,
						stdio: ['ignore', process.stdout, process.stderr]
					});

					child.on('error', (err) => {
						reject(err);
					});

					child.on('close', (code) => {
						resolve({
							proc: child,
							code: code
						});
					});
				} catch ( err ) {
					reject(err);
				}
			});
		});
};
