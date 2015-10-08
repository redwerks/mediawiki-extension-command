"use strict";
var nom = require('./'),
	Promise = require('bluebird'),
	path = require('path'),
	glob = Promise.promisify(require('glob')),
	chalk = require('chalk'),
	getWikiRoot = require('../wiki-root');

nom.command('list')
	.help('List information on locally present MediaWiki extensions.')
	.options({})
	.callback(function() {
		var wiki = getWikiRoot();

		return glob('*/', {cwd: wiki.extensions})
			.map((name) => name.replace(/\/$/, ''))
			.map((name) => {
				var local = wiki.getExtension(name);

				return Promise.props({
					name,
					local: local,
					source: local.then((ext) => ext.extractSource())
				});
			}, {concurrency: 5})
			.map(({name, local, source: is}) => {
				var info = is && is.listInfo();
				console.log(`${name} (${is ? chalk.green(is.name) : chalk.grey('unknown')}${info ? `; ${info}` : ''})`);
			});
	});
