"use strict";
var chalk = require('chalk'),
	error = require('../util/error'),
	InstallSource = require('./install-source');

module.exports = InstallSource.extend('git-master', {
	extractSource() {
		return this.git.symbolicRef('HEAD')
			.then((HEAD) => {
				if ( HEAD === 'refs/heads/master' ) {
					return this.git.revParse('master')
						.then((rev) => {
							return {
								rev: rev
							};
						});
				}
			});
	},

	checkUpdates() {
		return this.git.origin()
			.then((origin) => {
				return this.git.fetch(origin, 'master')
					.then(() => this.git.revList(`${origin}/master...HEAD`))
					.then((revs) => {
						if ( revs.length ) {
							return {
								rev: revs[0],
								count: revs.length
							};
						}
					});
			});
	},

	displayInfo({pair}) {
		pair('Installed commit', this.data.rev);
	},

	listInfo() {
		return this.git.abbrRev(this.data.rev);
	},

	displayUpdateInfo({line, pair}, update) {
		if ( update ) {
			pair('Latest commit', update.rev);
			pair('Updates available', `${update.count} revs`);
		} else {
			line(chalk.green.bold('No updates'));
		}
	},

	updateInfo(update) {
		return `${this.git.abbrRev(this.data.rev)} -> ${this.git.abbrRev(update.rev)} [${update.count} revs]`;
	},

	download(remote) {
		return this.git.clone(remote.repository, {progress: true, branch: 'master'});
	},

	update() {
		return this.git.origin()
			.then((origin) => {
				return this.git.pull(origin, 'master', {progress: true, 'ff-only': true});
			});
	},

	switchTo(fromSource) {
		if ( !/^git-/.test(fromSource.name) ) {
			error(`Cannot switch from a non-git source to git-master`, 'UNSUPPORTED_SWITCH');
		}

		return this.git.origin()
			.then((origin) => {
				return this.git.fetch(origin, 'master')
					.then(() => {
						return this.git.checkout('master');
					});
			});
	}
});
