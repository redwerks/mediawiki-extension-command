"use strict";
var nom = require('./'),
	Promise = require('bluebird'),
	chalk = require('chalk'),
	getWikiRoot = require('../wiki-root'),
	LocalExtension = require('../local-extension'),
	RemoteExtension = require('../remote-extension');

nom.command('info')
	.help('Output information for a single MediaWiki extension, both installed and uninstalled.')
	.options({
		name: {
			position: 1,
			required: true,
			type: "string",
			help: "The MediaWiki extension to output information for"
		},
		exact: {
			flag: true,
			help: "Do not ask the server to resolve extension aliases (Note: This makes <name> case sensitive)"
		},
		local: {
			abbr: 'l',
			flag: true,
			help: "Only output information for installed extensions"
		},
		remote: {
			abbr: 'r',
			flag: true,
			help: "Ignore locally installed extensions and lookup information from the server"
		}
	})
	.callback(function(args) {
		var wiki = getWikiRoot(),
			name = Promise.try(() => {
				if ( args.exact ) {
					return args.name;
				}

				// @todo Lookup alias(es) from server
				return args.name;
			});

		function getLocal(name) {
			return wiki.getExtension(name)
				.then((ext) => {
					return ext.extractSource()
						.then((is) => {
							if ( is ) {
								return is.checkUpdates()
									.then((updates) => {
										return {
											ext: ext,
											source: is,
											updates: updates
										}
									});
							} else {
								return {
									ext: ext
								};
							}
						});
				})
				.catch((err) => {
					if ( err.code === 'EXT_NOT_INSTALLED' ) {
						return false;
					}

					throw err;
				});
		}

		function getRemote(name) {
			return RemoteExtension.get(name);
		}

		if ( !args.local && !args.remote ) {
			args.local = true;
			args.remote = true;
		}

		function line(text) {
			console.log(text);
		}

		function pair(label, value) {
			if ( !value ) { return; }
			line(`${chalk.bold(label)}: ${value}`);
		}

		function label(text) {
			line(`${chalk.bold(text)}:`);
		}

		function listItem(item) {
			line(` - ${item}`);
		}

		return Promise.resolve(name)
			.then((name) => {
				var local = args.local ? getLocal(name) : null,
					remote = args.remote ? getRemote(name) : null;

				return Promise.join(local, remote)
					.spread((local, remote) => {
						if ( local || remote ) {
							pair('id', (remote && remote.id) || (local && local.id));
							pair('Name', (remote && remote.name) || (local && local.name));
						} else {
							pair('id', chalk.grey('Unknown'))
						}

						if ( remote ) {
							label('Available sources');
							remote.sources.forEach((source) => {
								if ( source === 'composer' ) {
									listItem(`${chalk.green(source)} (${chalk.cyan(remote.composerName)})`);
								} else {
									listItem(chalk.green(source));
								}
							});

							pair('Git repository', remote.repository);
							pair('Version hint', remote.versionHint);
						}

						if ( local ) {
							pair('Installed', chalk.green('Yes'));
							if ( local.source ) {
								pair('Installed source', chalk.green(local.source.name));
								var lib = {line, pair, label, listItem};
								local.source.displayInfo(lib);
								local.source.displayUpdateInfo(lib, local.updates);
							} else {
								pair('Installed source', chalk.grey('Unknown'));
							}
						} else if ( local === false ) {
							pair('Installed', chalk.yellow('No'));
						}
					})
			});



		// Promise.resolve(name)
		// 	.then((name) => {
		// 		if ( args.local ) {
		// 			return Promise.method(doLocal)(name)
		// 				.catch((err) => {
		// 					if ( err.code === 'EXT_NOT_INSTALLED' ) {
		// 						if ( args.remote ) {
		// 							return Promise.method(doRemote)(name);
		// 						} else {
		// 							console.log('@todo Output nice "Extension not installed" message when we use --local');
		// 						}
		// 					} else {
		// 						throw err;
		// 					}
		// 				});
		// 		} else {
		// 			return Promise.method(doRemote)(name);
		// 		}
		// 	});
	});
