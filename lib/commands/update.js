"use strict";
var nom = require('./'),
	Promise = require('bluebird'),
	_ = require('lodash'),
	glob = Promise.promisify(require('glob')),
	chalk = require('chalk'),
	error = require('../util/error'),
	getWikiRoot = require('../wiki-root'),
	inquirer = require('../inquirer');

function interactiveNames({wiki}) {
	return glob('*/', {cwd: wiki.extensions})
		.map((name) => name.replace(/\/$/, ''))
		.then((names) => {
			return inquirer.prompt(
				[
					{
						type: 'checkbox',
						name: 'names',
						message: "Update extensions",
						choices: names
					}
				])
				.get('names');
		});
}

nom.command('update')
	.help('Update MediaWiki extension(s).')
	.options({
		name: {
			position: 1,
			list: true,
			type: "string",
			help: "The MediaWiki extension(s) to update."
		},
		all: {
			abbr: 'a',
			flag: true,
			help: "Update all extensions"
		}
	})
	.callback(function(args) {
		var wiki = getWikiRoot(),
			names;

		if ( args.all ) {
			if ( args.name ) {
				error("Unexpected extension name while --all was passed.", 'UNEXPECTED_ARG');
			} else {
				names = glob('*/', {cwd: wiki.extensions})
					.map((name) => name.replace(/\/$/, ''));
			}
		} else if ( args.name ) {
			names = args.name
				.map((name) => Promise.try(() => {
					if ( args.exact ) {
						return name;
					}

					// @todo Lookup alias(es) from server
					return name;
				}));
		} else {
			names = interactiveNames({wiki});
		}

		return Promise.resolve(names)
			.map((name) => {
				var local = wiki.getExtension(name);

				return Promise.props({
					name,
					// remote: RemoteExtension.get(name),
					local: local,
					source: local.then((ext) => ext.extractSource())
				});
			})
			.map(({name, source: is}) => {
				if ( is ) {
					console.error(chalk.green(`Updating ${chalk.cyan(name)}`));
					return is.update();
				} else {
					console.error(chalk.yellow(`${chalk.cyan(name)} cannot be updated`));
				}
			}, {concurrency: 1})
	});
