"use strict";
var Promise = require('bluebird'),
	chalk = require('chalk'),
	error = require('../util/error'),
	InstallSource = require('./install-source');

module.exports = InstallSource.extend('git-rel', {
	extractSource() {
		return this.git.symbolicRef('HEAD')
			.then((HEAD) => {
				var m = HEAD && /^refs\/heads\/(REL(\d+)_(\d+))$/.exec(HEAD);
				if ( m ) {
					return this.git.revParse(HEAD)
						.then((rev) => {
							return {
								rel: [parseInt(m[2]), parseInt(m[3])],
								branch: m[1],
								rev: rev
							};
						});
				}
			});
	},

	releaseBranch(release) {
		return `REL${release.join('_')}`;
	},

	checkoutTrackingBranch(branch, track) {
		return this.git.commitRefParse(branch)
			.then((rev) => {
				if ( rev ) {
					// Checkout the REL branch if it exists
					return this.git.checkout(branch);
				} else {
					// Create the branch and checkout if the REL branch doesn't already exist locally
					return this.git.checkout(branch, {track: track});
				}
			});
	},

	checkUpdates() {
		return Promise.join(this.git.origin(), this.root.getVersion())
			.spread((origin, {release}) => {
				if ( this.data.rel[0] === release[0] && this.data.rel[1] === release[1] ) {
					var branch = this.releaseBranch(release);
					return this.git.fetch(origin, branch)
						.then(() => this.git.revList(`${origin}/${branch}...HEAD`))
						.then((revs) => {
							if ( revs.length ) {
								return {
									rev: revs[0],
									count: revs.length
								};
							}
						});
				} else {
					// Branch switch needed
					return {
						rel: release,
						branch: this.releaseBranch(release)
					};
				}
			})
	},

	displayInfo({pair}) {
		pair('Release branch', this.data.branch);
		pair('Installed commit', this.data.rev);
	},

	listInfo() {
		return `${this.data.branch}; ${this.git.abbrRev(this.data.rev)}`;
	},

	displayUpdateInfo({line, pair}, update) {
		if ( update && update.branch ) {
			pair('New branch', update.branch);
		} else if ( update ) {
			pair('Latest commit', update.rev);
			pair('Updates available', `${update.count} revs`);
		} else {
			line(chalk.green.bold('No updates'));
		}
	},

	updateInfo(update) {
		if ( update && update.branch ) {
			return `${this.data.branch} -> ${update.branch}`;
		} else {
			return `${this.git.abbrRev(this.data.rev)} -> ${this.git.abbrRev(update.rev)} (${update.count} revs)`;
		}
	},

	download(remote) {
		return this.root.getVersion()
			.then(({release}) => {
				var branch = this.releaseBranch(release);
				return this.git.clone(remote.repository, {progress: true, branch: branch});
			});
	},

	update() {
		return Promise.join(this.git.origin(), this.root.getVersion())
			.spread((origin, {release}) => {
				var branch = this.releaseBranch(release);

				// Fetch updates for origin/REL#_##
				return this.git.fetch(origin, branch)
					.then(() => {
						// If we aren't on the correct REL branch
						if ( this.data.branch !== branch ) {
							// Checkout the REL#_## branch, creating it with --track if it doesn't already exist
							return this.checkoutTrackingBranch(branch, `${origin}/${branch}`);
						}
					})
					.then(() => {
						// Merge from origin/REL#_## in case we're pulling new commits or just checked out a stale branch
						return this.git.merge(`${origin}/${branch}`, {'ff-only': true});
					});
			});
	},

	switchTo(fromSource) {
		if ( !/^git-/.test(fromSource.name) ) {
			error(`Cannot switch from a non-git source to git-tag`, 'UNSUPPORTED_SWITCH');
		}

		return Promise.join(this.git.origin(), this.root.getVersion())
			.spread((origin, {release}) => {
				var branch = this.releaseBranch(release);

				// Fetch commits for origin/REL#_##
				return this.git.fetch(origin, branch)
					.then(() => {
						// Checkout the REL#_## branch, creating it with --track if it doesn't already exist
						return this.checkoutTrackingBranch(branch, `${origin}/${branch}`);
					})
					.then(() => {
						// Merge from origin/REL#_## in case we're pulling new commits or just checked out a stale branch
						return this.git.merge(`${origin}/${branch}`, {'ff-only': true});
					});
			});
	}
});
