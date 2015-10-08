"use strict";
var nom = require('./'),
	Promise = require('bluebird'),
	path = require('path'),
	glob = Promise.promisify(require('glob')),
	chalk = require('chalk'),
	getWikiRoot = require('../wiki-root');

nom.command('outdated')
	.help('List MediaWiki extensions that can be updated.')
	.options({})
	.callback(function() {
		var wiki = getWikiRoot();

		return glob('*/', {cwd: wiki.extensions})
			.map((name) => name.replace(/\/$/, ''))
			.map((name) => {
				var local = wiki.getExtension(name),
					source = local.then((ext) => ext.extractSource());

				return Promise.props({
					name,
					local: local,
					source: source,
					update: source.then((is) => is && is.checkUpdates())
				});
			}, {concurrency: 5})
			.map(({name, local, source: is, update}) => {
				if ( is && update ) {
					var info = is.updateInfo(update);
					console.log(`${name} (${info})`);
				}
			});
	});
