"use strict";
var _ = require('lodash'),
	gitCmd = require('git-cmd'),
	{LineStream} = require('byline'),
	es = require('event-stream'),
	externalCommands = require('./external-commands'),
	gitPath = _.memoize(() => externalCommands.findGit()),
	_gitPath,
	git = (args, opts={}) => gitCmd(args, {...opts, git: _gitPath});

module.exports = Git;

function Git(dir) {
	this.dir = dir;
}

_.merge(Git.prototype, {
	git(args) {
		return git(args, {cwd: this.dir, GIT_DIR: '.git/'});
	},
	abbrRev(rev) {
		var m = rev && String(rev).match(/^[0-9a-f]{7}/i);

		if ( m ) {
			return m[0];
		}

		return false;
	}
});

_.each({
	revParse(ref) { // @fixme Replace with refParse
		return this.git(['rev-parse', ref])
			.oneline();
	},
	symbolicRef(ref) {
		return this.git(['symbolic-ref', ref])
			.oneline({silenceErrors: true})
			.catch(() => false);
	},
	commitRefParse(ref) {
		return this.git(['rev-parse', '--revs-only', '--no-flags', `${ref}^{commit}`])
			.oneline()
			.then((rev) => rev || false);
	},
	revName() {
		return this.git(['name-rev', '--name-only', '--no-undefined', '--always', 'HEAD'])
			.oneline()
			.then((rev) => /^[0-9a-f]{7}$/.test(rev) ? false : rev);
	},
	revTag() {
		return this.git(['name-rev', '--name-only', '--no-undefined', '--tags', '--always', 'HEAD'])
			.oneline({silenceErrors: true})
			.then((rev) => /^[0-9a-f]{7}$/.test(rev) ? false : rev)
			.then((rev) => rev && rev.replace(/\^0$/, ''))
			.catch(() => false)
	},
	tags() {
		return this.git(['show-ref'])
			.pipe(new LineStream())
			.pipe(es.mapSync((line) => {
				var m = line.match(/^([0-9a-f]+)\s+(.+)$/);
				return m[2];
			}))
			.array()
			.filter((ref) => /^refs\/tags\//.test(ref))
			.map((ref) => ref.replace(/^refs\/tags\//, ''));
	},
	remoteTags(repo) {
		return git(['ls-remote', '--tags', repo])
			.pipe(new LineStream())
			.pipe(es.mapSync((line) => {
				var m = line.match(/^([0-9a-f]+)\s+(.+)$/);
				return m[2];
			}))
			.array()
			.map((ref) => ref.replace(/^refs\/tags\/(.+?)?$/, '$1'));
	},
	revList(refs) {
		return this.git(['rev-list', refs])
			.pipe(new LineStream())
			.array();
	},
	origin() {
		return this.git(['remote'])
			.pipe(new LineStream())
			.array()
			.then((remotes) => {
				if ( _.contains(remotes, 'origin') ) {
					return 'origin';
				}

				if ( remotes.length === 1 ) {
					return remotes[0];
				}

				if ( remotes.length ) {
					throw new Error(`Cannot determine origin for git repository ${this.dir}.`);
				} else {
					throw new Error(`Git repository ${this.dir} has no remotes.`);
				}
			})
	},
	clone(repo, opts) {
		var cmd = git(['clone']);

		for ( var key in opts ) {
			var value = opts[key];
			if ( !value ) { continue; }
			cmd.push(`--${key}`);
			if ( value !== true ) {
				cmd.push(value);
			}
		}

		cmd.push('--');
		cmd.push(repo);
		cmd.push(this.dir);

		return cmd.pass();
	},
	checkout(ref, opts={}) {
		if ( opts.track ) {
			return this.git(['checkout', '-b', ref, '--track', opts.track])
				.pass();
		} else {
			return this.git(['checkout', ref])
				.pass();
		}
	},
	fetch(remote, branch) {
		var cmd = this.git(['fetch']);
		if ( remote ) {
			cmd.push(remote);
			if ( branch ) {
				cmd.push(branch);
			}
		}

		return cmd.pass();
	},
	merge(head, opts) {
		var cmd = this.git(['merge']);

		for ( var key in opts ) {
			var value = opts[key];
			if ( !value ) { continue; }
			cmd.push(`--${key}`);
			if ( value !== true ) {
				cmd.push(value);
			}
		}

		cmd.push(head);

		return cmd.pass();
	},
	pull(remote, branch, opts) {
		var cmd = this.git(['pull']);

		for ( var key in opts ) {
			var value = opts[key];
			if ( !value ) { continue; }
			cmd.push(`--${key}`);
			if ( value !== true ) {
				cmd.push(value);
			}
		}

		if ( remote ) {
			cmd.push(remote);
			if ( branch ) {
				cmd.push(branch);
			}
		}

		return cmd.pass();
	}
}, (fn, name) => {
	Git.prototype[name] = function() {
		return gitPath()
			.then((gitPath) => {
				_gitPath = gitPath;
				return fn.apply(this, arguments);
			});
	};
});
