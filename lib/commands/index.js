"use strict";
var Promise = require('bluebird'),
	chalk = require('chalk'),
	nom = require('nomnom')
		.script('mediawiki-extension')
		.options({
			verbose: {
				abbr: 'v',
				flag: true,
				help: ""
			}
		});

{
	let command = nom.command;
	nom.command = function() {
		var cmd = command.apply(this, arguments),
			callback = cmd.callback;

		cmd.callback = function(cb) {
			return callback.call(this, function(args) {
				Promise.method(cb)(...arguments)
					.catch((err) => {
						var {message} = err;
						message = message.replace(/^Error:\s*/, '').trim();
						console.error(chalk.red(message))

						if ( args.verbose || !err.code || err.errno ) {
							if ( err.stack ) {
								console.error(chalk.yellow('Stack trace:'));
								console.error(err.stack);
							}
						}

						process.exit(1);
					});
			});
		};

		return cmd;
	};
}

module.exports = nom;

// nom.nocommand()

require('./setup');
require('./info');
require('./list');
require('./outdated');
require('./download');
require('./update');
require('./switch');
require('./config');
