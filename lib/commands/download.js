"use strict";
var nom = require('./'),
	Promise = require('bluebird'),
	crypto = require('crypto'),
	chalk = require('chalk'),
	error = require('../util/error'),
	getWikiRoot = require('../wiki-root'),
	RemoteExtension = require('../remote-extension');

nom.command('download')
	.help('Download a MediaWiki extension.')
	.options({
		name: {
			position: 1,
			required: true,
			list: true,
			type: "string",
			help: "The MediaWiki extension to download"
		},
		force: {
			abbr: 'f',
			flag: true,
			help: "If an extension with that name is already installed, delete it to make way for this download."
		}
	})
	.callback(function(args) {
		return Promise.resolve(args.name)
			.map((name) => {
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
			.map(({wiki, name}) => {
				var local = wiki.makeExtension(name);

				return Promise.props({
					wiki,
					name,
					remote: RemoteExtension.get(name),
					local: local,
					exists: local.exists()
				});
			})
			.tap((exts) => {
				return Promise.resolve(exts)
					.map(({wiki, name, remote, local, exists}) => {
						if ( exists ) {
							if ( args.force ) {
								return local.delete();
							} else {
								error(`${name} is already installed.`, 'EXT:INSTALLED');
							}
						}
					});
			})
			.map(({wiki, name, remote, local, exists}) => {
				// @todo Preferred sources?
				var source = remote.sources[0],
					is = local.getSourceFor(source);

				console.error(chalk.green(`Downloading ${chalk.cyan(name)}`));
				return is.download(remote);
			});
	});
