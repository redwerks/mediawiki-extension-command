"use strict";
var nom = require('./'),
	Promise = require('bluebird'),
	_ = require('lodash'),
	chalk = require('chalk'),
	conf = require('../configstore'),
	knownKeys = [
		'php-path',
		'git-path',
		'composer-path',
		'api-base'
	];

nom.command('config')
	.help('Change shared mediawiki-extension command config.')
	.options({
		action: {
			position: 1,
			required: true,
			type: "string",
			choices: ['list', 'get', 'set', 'reset'],
			help: "list, get, set, reset"
		},
		key: {
			position: 2,
			required: false,
			type: "string",
			help: "The key to get or set."
		},
		value: {
			position: 3,
			required: false,
			type: "string",
			help: "The value to set."
		}
	})
	.callback(function(args) {
		var argreq = (arg) => {
				if ( arg in args ) { return; }
				console.log(chalk.red(`${arg} argument is required`));
				process.exit(1);
			},
			keyknown = () => {
				if ( _.contains(knownKeys, args.key) ) { return; }
				console.log(chalk.red(`${args.key} is not a valid config key`));
				process.exit(1);
			};

		if ( args.action === 'get' ) {
			argreq('key');
			keyknown();
			console.log(conf.get(key));
		} else if ( args.action === 'set' ) {
			argreq('key');
			keyknown();
			argreq('value');
			conf.set(args.key, args.value);
		} else if ( args.action === 'reset' ) {
			argreq('key');
			keyknown();
			conf.del(args.key);
		} else {
			var longest = _(knownKeys).pluck('length').max();
			_.forOwn(knownKeys, (key) => {
				var val = conf.get(key);
				console.log(`${chalk.bold(_.padRight(key, longest))} ${val === undefined ? chalk.grey('undef') : chalk.green(val)}`);
			});
		}
	});
