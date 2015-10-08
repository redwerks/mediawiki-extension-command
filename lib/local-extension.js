"use strict";
var debug = require('debug')('mediawiki-extension'),
	_ = require('lodash'),
	Promise = require('bluebird'),
	crypto = require('crypto'),
	path = require('path'),
	chalk = require('chalk'),
	stat = require('./util/stat'),
	Git = require('./git'),
	tmpdir = require('os-tmpdir'),
	mv = Promise.promisify(require('mv')),
	error = require('./util/error'),
	installSources = require('./install-source');

module.exports = LocalExtension;

function LocalExtension(dir, root) {
	this.dir = dir;
	this.git = new Git(this.dir);
	this.root = root;
}

LocalExtension.examineFromPath = function(dir, root) {
	var ext = new LocalExtension(dir, root);

	return ext.exists()
		.then((exists) => {
			if ( exists ) {
				return ext;
			} else {
				error(`${dir} does not exist or is not a directory`, 'EXT_NOT_INSTALLED');
			}
		});
};

_.merge(LocalExtension.prototype, {
	exists() {
		return stat.isDirectory(this.dir);
	},
	extractSource() {
		return Promise.resolve(installSources)
			.reduce((result, Source) => {
				if ( result ) {
					return result;
				}

				var is = new Source({
					dir: this.dir,
					git: this.git,
					root: this.root
				});

				return is.extractSource()
					.then((source) => {
						if ( source ) {
							debug('Extracted source for %s is %s (%o).', this.dir, is.name, source);
							return {
								name: is.name,
								data: source === true ? {} : source
							};
						} else {
							debug('Extracted source for %s is not %s.', this.dir, is.name);
						}
					});
			}, null)
			.then((source) => {
				if ( source ) {
					return this.getSourceFor(source.name, source.data);
				}
			});
	},
	getSourceFor(name, data) {
		var Source = installSources.get(name);

		return new Source({
			dir: this.dir,
			git: this.git,
			root: this.root,
			data: data
		});
	},
	delete() {
		var name = path.basename(this.dir),
			dest = path.join(tmpdir(), `${name}-${crypto.pseudoRandomBytes(6).toString('hex')}`);

		return mv(this.dir, dest, {clobber: false})
			.then(() => {
				console.error(chalk.yellow(`Existing extension relocated to ${chalk.cyan(dest)}`));
			});

	}
});
