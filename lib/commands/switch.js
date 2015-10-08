"use strict";
var nom = require('./'),
	Promise = require('bluebird'),
	_ = require('lodash'),
	chalk = require('chalk'),
	error = require('../util/error'),
	getWikiRoot = require('../wiki-root'),
	RemoteExtension = require('../remote-extension');

nom.command('switch')
	.help('Change the upgrade method for a MediaWiki extension.')
	.options({
		name: {
			position: 1,
			required: true,
			type: "string",
			help: "The MediaWiki extension to switch"
		},
		type: {
			position: 2,
			required: false, // interactive if not given
			type: "string",
			choices: ['composer', 'git-tag', 'git-stable', 'git-master', 'git-rel', 'extensiondistributor'],
			help: "The upgrade method to use for the extension."
		},
		force: {
			abbr: 'f',
			flag: true,
			help: "If a safe switch cannot be performed, delete the extension and download a new version from the new source."
		}
	})
	.callback(function(args) {
		return Promise.resolve(args.name)
			.then((name) => {
				var wiki = getWikiRoot(),
					name = Promise.try(() => {
						if ( args.exact ) {
							return name;
						}

						// @todo Lookup alias(es) from server
						return name;
					});

				return Promise.props({
					wiki,
					name,
				});
			})
			.then(({wiki, name}) => {
				var local = wiki.getExtension(name);

				return Promise.props({
					wiki,
					name,
					remote: RemoteExtension.get(name),
					local: local,
					source: local.then((ext) => ext.extractSource())
				});
			})
			.then(({wiki, name, remote, local, source: is}) => {
				if ( is.name === args.type ) {
					error(`${name} is already using a ${args.type} source.`, 'SAME_SOURCE');
				}

				if ( !_.contains(remote.sources, args.type) ) {
					error(`${name} does not have a ${arg.type} source.`, 'INCOMPATIBLE_SOURCE');
				}

				var switchSource = local.getSourceFor(args.type);

				console.error(chalk.green(`Switching installation source for ${chalk.cyan(name)} from ${is.name} to ${switchSource.name}`));
				return switchSource.switchTo(is, {remote})
					.catch((err) => {
						if ( err.code === 'UNSUPPORTED_SWITCH' ) {
							if ( args.force ) {
								return (typeof is.remove === 'function' ? is.remove() : local.delete())
									.then(() => {
										console.error(chalk.green(`Downloading ${chalk.cyan(name)}`));
										return switchSource.download(remote);
									});
							} else {
								console.error(chalk.red(err.message));
								console.error(chalk.yellow(`Run with --force to delete and replace the existing extension.`));
								process.exit(1);
							}
						}

						throw err;
					});
			});
	});
