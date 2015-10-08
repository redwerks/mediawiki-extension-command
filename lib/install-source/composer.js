"use strict";
var Promise = require('bluebird'),
	_ = require('lodash'),
	path = require('path'),
	chalk = require('chalk'),
	{loadJSON} = require('../util/fs'),
	request = require('../request'),
	composer = require('../composer'),
	error = require('../util/error'),
	InstallSource = require('./install-source'),
	versionString = {
		re: /^(\d+)(?:\.(\d+)){1,3}$/,
		is(string) {
			return versionString.re.test(string);
		},
		split(string) {
			var [a, b, c, d] = string.split('.').map((n) => parseInt(n));
			return [a || 0, b || 0, c || 0, d || 0];
		},
		compare(a, b) {
			a = versionString.split(a);
			b = versionString.split(b);

			for ( var i = 0; i < 4; i++ ) {
				if ( a[i] > b[i] ) {
					return +1;
				}
				if ( a[i] < b[i] ) {
					return -1;
				}
			}

			return 0;
		},
		gt(a, b) {
			return versionString.compare(a, b) > 0;
		}
	};

function composerFile(dir, ext='json') {
	return loadJSON(path.join(dir, `composer.${ext}`))
		.catch((err) => {
			if ( err.code === 'ENOENT' ) {
				return false;
			}

			throw err;
		});
}

function packagist(url) {
	return request.getAsync(
		{
			baseUrl: 'https://packagist.org/',
			url: url,
			json: true
		})
		.spread((res, body) => {
			if ( res.statusCode === 200 ) {
				return body;
			} else if ( typeof body === 'object' ) {
				throw _.merge(new Error(body.message),
					{
						...body,
						status: res.status
					});
			} else {
				throw new Error(body);
			}
		})
		.catch((err) => {
			if ( err.code === 'ECONNREFUSED' ) {
				error(`Could not connect to Packagist.`, 'PACKAGIST:NO_CONNECTION');
			}

			throw err;
		});
}

module.exports = InstallSource.extend('composer', {
	extractSource() {
		return Promise.join(composerFile(this.dir), composerFile(this.root.IP), composerFile(this.root.IP, 'lock'))
			.spread((extMeta, rootMeta, rootLock) => {
				if ( !extMeta || !rootMeta || !rootLock || !extMeta.name ) {
					return false;
				}

				var composerName = extMeta.name,
					extLock = _.find(rootLock.packages, {name: composerName}),
					reqVersion = rootMeta.require[composerName];

				if ( extLock ) {
					return {
						name: composerName,
						version: extLock.version,
						explicit: !!reqVersion
					};
				}
			});
	},

	checkUpdates() {
		return packagist(`/packages/${this.data.name}.json`)
			.get('package').get('versions')
			.then((versions) => {
				var newer = Object.keys(versions)
					.filter((version) => versionString.gt(version, this.data.version))
					.filter(versionString.is);
				newer.sort(versionString.compare);

				if ( newer.length ) {
					return _.chain(newer)
						.last()
						.thru((version) => {
							return {
								version: version,
								count: newer.length
							};
						})
						.value();
				}
			});
	},

	displayInfo({line, pair}) {
		if ( !this.data.explicit ) {
			line(chalk.yellow('Not explicitly installed'));
		}
		pair('Installed version', this.data.version);
	},

	listInfo() {
		return this.data.version;
	},

	displayUpdateInfo({line, pair}, update) {
		if ( update ) {
			pair('Updates available', `${update.count} stabled versions`);
			pair('Latest version', update.version);
		} else {
			line(chalk.green.bold('No updates'));
		}
	},

	updateInfo(update) {
		return `${this.data.version} -> ${update.version}`;
	},

	download(remote) {
		return composer(
			[
				'require',
				'--update-with-dependencies',
				'--update-no-dev',
				'--ansi',
				'--no-interaction',
				remote.composerName
			],
			{
				cwd: this.root.IP
			});
	},

	update() {
		return this.checkUpdates()
			.then((update) => {
				if ( update ) {
					return this.download({composerName: this.data.name});
				} else {
					console.error(chalk.green('Nothing to update'));
				}
			});
	},

	remove() {
		// Things installed with composer should be removed by composer so the composer.{json,lock} files are updated
		return composer(
			[
				'remove',
				'--update-with-dependencies',
				'--update-no-dev',
				'--ansi',
				'--no-interaction',
				this.data.name
			],
			{
				cwd: this.root.IP
			});
	},

	switchTo(fromSource) {
		error(`Cannot safe switch from any source to composer`, 'UNSUPPORTED_SWITCH');
	}
});
