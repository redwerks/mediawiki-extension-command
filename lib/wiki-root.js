"use strict";
var Promise = require('bluebird'),
	path = require('path'),
	fs = Promise.promisifyAll(require('graceful-fs')),
	findup = require('findup-sync'),
	LocalExtension = require('./local-extension');

/**
 * Command to find the location of the MediaWiki installation path relative to the CWD
 */
function find(cwd) {
	if ( process.env.MW_INSTALL_PATH ) {
		if ( verify(process.env.MW_INSTALL_PATH) ) {
			return process.env.MW_INSTALL_PATH;
		}
	} else {
		var defaultSettings = findup('includes/DefaultSettings.php', {cwd: cwd});
		if ( defaultSettings ) {
			var IP = path.resolve(path.dirname(defaultSettings), '../');
			if ( verify(IP) ) {
				return IP;
			}
		}
	}

	var err = new Error('Could not find MediaWiki install path from CWD or MW_INSTALL_PATH.');
	err.code = 'NOT_IN_MW_IP';
	throw err;
}

/**
 * Command to verify that a path looks like a MediaWiki install.
 * Generally it should have DefaultSettings.php and extensions/.
 */
function verify(root) {
	try {
		var stat;

		stat = fs.statSync(path.join(root, 'includes/DefaultSettings.php'));
		if ( !stat || !stat.isFile() ) {
			return false;
		}

		stat = fs.statSync(path.join(root, 'extensions'));
		if ( !stat || !stat.isDirectory() ) {
			return false;
		}

		return true;
	} catch ( err ) {
		if ( err.code === 'ENOENT' ) {
			return false;
		} else {
			throw err;
		}
	}
}

function WikiRoot(IP) {
	this.IP = IP;
	this.extensions = path.join(IP, 'extensions');
	this.LocalSettings = path.join(IP, 'LocalSettings.php');
	this.DefaultSettings = path.join(IP, 'includes', 'DefaultSettings.php');
}

WikiRoot.prototype.getExtension = function(name) {
	return LocalExtension.examineFromPath(path.join(this.extensions, name), this);
};

WikiRoot.prototype.makeExtension = function(name) {
	return new LocalExtension(path.join(this.extensions, name), this);
};

WikiRoot.prototype.getVersion = function() {
	return fs.readFileAsync(this.DefaultSettings, 'utf8')
		.then((text) => {
			var m = /\$wgVersion\s*=\s*(['"])(.+?)\1/.exec(text),
				version,
				release;

			if ( m ) {
				version = m[2];
				m = /^(\d+)\.(\d+)/.exec(version);
				if ( m ) {
					release = [parseInt(m[1]), parseInt(m[2])];
					return {version, release};
				}
			}

			throw error("Could not detect MediaWiki version.", 'NO_VERSION');
		});
};

module.exports = function(cwd) {
	return new WikiRoot(find(cwd));
};
