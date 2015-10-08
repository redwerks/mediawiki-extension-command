"use strict";
var Promise = require('bluebird'),
	_ = require('lodash'),
	chalk = require('chalk'),
	semver = require('semver'),
	error = require('../util/error'),
	InstallSource = require('./install-source'),
	versionTag = {
		re: /^v?(\d+)\.(\d+)(?:\.(\d+))?$/,
		is(tag) {
			return versionTag.re.test(tag);
		},
		toSemver(tag) {
			var m = versionTag.re.exec(tag);
			if ( !m ) {
				throw new Error(tag + ' is not a version tag');
			}

			return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3]) || 0].join('.');
		}
	};

module.exports = InstallSource.extend('git-tag', {
	extractSource() {
		return this.git.symbolicRef('HEAD')
			.then((HEAD) => {
				if ( HEAD === false ) {
					return this.git.revTag()
						.then((revName) => {
							if ( revName && versionTag.is(revName) ) {
								return {
									versionTag: revName,
									version: versionTag.toSemver(revName)
								};
							}
						});
				}
			});
	},

	filterTags(tags) {
		return _(tags)
			.filter((tag) => versionTag.is(tag))
			.map((tag) => {
				return {
					versionTag: tag,
					version: versionTag.toSemver(tag)
				};
			})
			.thru((arr) => {
				arr.sort((a, b) => semver.compare(a.version, b.version));
				return arr;
			})
			.value();
	},

	checkUpdates() {
		return this.git.origin()
			.then((origin) => this.git.fetch(origin, '--tags'))
			.then(() => this.git.tags()).then(this.filterTags)
			.then((tags) => {
				var newer = _.filter(tags, (v) => semver.gt(v.version, this.data.version));

				if ( newer.length ) {
					return _.chain(newer)
						.last()
						.merge({
							count: newer.length
						})
						.value();
				}
			});
	},

	displayInfo({pair}) {
		pair('Installed version', this.data.version);
	},

	listInfo() {
		return this.data.version;
	},

	displayUpdateInfo({line, pair}, update) {
		if ( update ) {
			pair('Updates available', `${update.count} tagged versions`);
			pair('Latest version', update.version);
		} else {
			line(chalk.green.bold('No updates'));
		}
	},

	updateInfo(update) {
		return `${this.data.version} -> ${update.version}`;
	},

	download(remote) {
		return this.git.remoteTags(remote.repository)
			.then((tags) => {
				tags = this.filterTags(tags);

				if ( tags.length ) {
					return _.last(tags)
				}
			})
			.then((tag) => {
				return this.git.clone(remote.repository, {progress: true, 'no-checkout': true})
					.then(() => {
						return this.git.checkout(tag.versionTag);
					});
			});
	},

	update() {
		return this.git.origin()
			.then((origin) => this.git.fetch(origin, '--tags'))
			.then(() => this.git.tags()).then(this.filterTags)
			.filter((v) => semver.gt(v.version, this.data.version))
			.then(_.last)
			.then((tag) => {
				if ( tag ) {
					return this.git.checkout(tag.versionTag);
				} else {
					console.error(chalk.green('Nothing to update'));
				}
			});
	},

	switchTo(fromSource) {
		if ( !/^git-/.test(fromSource.name) ) {
			error(`Cannot switch from a non-git source to git-tag`, 'UNSUPPORTED_SWITCH');
		}

		return this.git.origin()
			.then((origin) => this.git.fetch(origin, '--tags'))
			.then(() => this.git.tags()).then(this.filterTags)
			.then((tag) => {
				return this.git.checkout(_.last(tag).versionTag);
			});
	}
});
