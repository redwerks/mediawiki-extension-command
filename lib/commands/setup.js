"use strict";
var nom = require('./'),
	Promise = require('bluebird'),
	chalk = require('chalk'),
	externalCommands = require('../external-commands');

nom.command('setup')
	.help('Make sure any prerequisites such as git and composer are setup.')
	.options({

	})
	.callback(function() {
		return Promise.resolve()
			.then(externalCommands.findPHP)
			.then(externalCommands.findGit)
			.then(externalCommands.findComposer)
			.then(() => {
				console.log(chalk.bold('Setup complete.'));
			});
	});
