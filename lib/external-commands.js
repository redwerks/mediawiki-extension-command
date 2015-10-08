"use strict";
var Promise = require('bluebird'),
	_ = require('lodash'),
	path = require('path'),
	fs = Promise.promisifyAll(require('graceful-fs')),
	child_process = require('child_process'),
	fmt = require('util').format,
	configstore = require('./configstore'),
	which = Promise.promisify(require('which')),
	xdg = require('xdg-basedir'),
	homedir = require('os-homedir'),
	tmp = Promise.promisifyAll(require('tmp')),
	mkdirp = Promise.promisify(require('mkdirp')),
	request = require('./request'),
	progressStream = require('progress-stream'),
	chalk = require('chalk'),
	clc = require('cli-color'),
	createThrobber = require('cli-color/throbber'),
	stripAnsi = require('strip-ansi'),
	exitMessage = require('./exit-message'),
	inquirer = require('./inquirer'),
	pkg = require('../package.json'),
	wikiRoot = require('./wiki-root');

// Delete temporary files on fatal exits
tmp.setGracefulCleanup();

function testExecutable(executablePath) {
	function executable(executablePath) {
		if ( fs.accessAsync ) {
			// fs.access is available in Node v0.12 and io.js
			return fs.accessAsync(executablePath, fs.R_OK | fs.X_OK);
		} else {
			// Fall back to a dumb and lazy stat to support Node v0.10
			return fs.statAsync(executablePath);
		}
	}

	return executable(executablePath)
		.then(() => {
			return {
				ok: true,
				path: executablePath
			};
		})
		.catch((err) => {
			if ( err.code === 'ENOENT' ) {
				return {
					ok: false,
					code: 'NOTEXIST'
				};
			} else if ( err.code === 'EACCES' ) {
				return {
					ok: false,
					code: 'NOTEXEC'
				};
			} else {
				return {
					ok: false
				};
			}
		});
}

function findExecutable(name, opts) {
	opts = opts || {};
	opts.testExecutable = opts.testExecutable || testExecutable;

	return which(name)
		.then((executablePath) => {
			if ( !executablePath ) {
				return {
					ok: false,
					code: 'NOTEXIST'
				};
			}

			return opts.testExecutable(executablePath);
		})
		.error(() => {
			return {
				ok: false,
				code: 'NOTEXIST'
			};
		});
}

function find(opts) {
	opts = opts || {};
	opts.testExecutable = opts.testExecutable || testExecutable;

	function checkUserConfiguration() {
		var executablePath = configstore.get(opts.setting);
		if ( executablePath ) {
			return opts.testExecutable(executablePath)
				.then((result) => {
					if ( !result.ok ) {
						// @todo Should we write a higher level logger to format this stuff?
						console.error(chalk.red(fmt(opts.messages.couldNotFindConfiguredExecutable, executablePath)));
					}

					if ( result.ok ) {
						return result.path;
					}
				});
		} else {
			return Promise.resolve(false);
		}
	}

	function executablePathSearch(names) {
		return Promise.resolve(names)
			.reduce((result, name) => {
				return result.ok ? result : findExecutable(name, opts);
			}, { ok: false });
	}

	function setup() {
		return executablePathSearch(opts.executableNames)
			.then((result) => {
				if ( result.ok ) {
					return result;
				}
				if ( opts.findExecutable ) {
					return opts.findExecutable();
				}
				return { ok: false };
			})
			.then((result) => {
				// If it was found return the result
				if ( result.ok && result.path ) {
					return result;
				} else {
					// Otherwise prompt the user for information
					var choices = [];
					// Let the user specify a path explicitly
					choices.push({
						value: 'ask-path',
						name: opts.messages.askPathPrompt
					});

					// Do the installation ourselves
					if ( opts.install ) {
						choices.push({
							value: 'install',
							name: opts.messages.installPrompt
						});
					}

					// Quit and let the user handle installation themselves.
					choices.push({
						value: 'quit',
						name: opts.messages.quitPrompt
					});
					return inquirer
						.prompt([{
							type: 'list',
							name: 'action',
							message: opts.messages.notFoundPrompt,
							choices: choices
						}])
						.then((answers) => {
							if ( answers.action === 'ask-path' ) {
								return inquirer
									.prompt([{
										type: 'input',
										name: 'path',
										message: opts.messages.pathPrompt,
										validate(path) {
											var done = this.async();
											opts.testExecutable(path)
												.then((result) => {
													if ( result.ok ) {
														done(true);
													} else if ( result.code === 'NOTEXEC' ) {
														done('That path is not executable.');
													} else {
														done('That path does not exist.');
													}
												})
												.catch((err) => {
													console.error(chalk.red('An error occured while trying to validate the input:'));
													console.error(chalk.red.dim(err));
													done(false);
												});
										}
									}])
									.then((answers) => {
										return {
											path: answers.path
										};
									});
							} else if ( answers.action === 'install' ) {
								return opts.install();
							} else {
								throw exitMessage(chalk.bold(opts.messages.exitMessage), {
									statusCode: 0
								});
							}
						});
				}
			})
			.then((result) => {
				if ( result.save === false ) {
					var relativePath = path.relative(process.cwd(), result.path),
						prettyPath = result.path;

					// If the path is something nearby print something like `./composer.phar`
					if ( result.path.length > relativePath.length ) {
						prettyPath = /\//.test(relativePath) ? relativePath : './' + relativePath;
					}
					console.log(chalk.bold(fmt("Using %s dynamically", chalk.cyan(prettyPath))));
				} else {
					// Format **text** in the message as bold.
					var pattern = opts.messages.settingSetTo
						.replace(/\*\*(.+?)\*\*/g, (m, text) => chalk.bold(text));

					console.log(fmt(pattern, chalk.cyan(result.path)));
					configstore.set(opts.setting, result.path);
				}

				return result.path;
			});
	}

	return checkUserConfiguration()
		.then((executablePath) => {
			if ( executablePath ) {
				return executablePath;
			}

			return setup();
		});
}

exports.findPHP = function() {
	return find({
		setting: 'php-path',
		executableNames: ['php', 'php5', 'php-cli'],
		messages: {
			couldNotFindConfiguredExecutable: 'Could not find the php executable at %s, please reconfigure.',
			notFoundPrompt: 'The git executable was not found:',
			askPathPrompt: "I have php installed outside of my PATH. Let me specify where.",
			pathPrompt: 'Path to git executable:',
			quitPrompt: "Let me install php on my own.",
			exitMessage: 'Please install php on your system.',
			settingSetTo: '**php path set to**: %s'
		}
	});
};

exports.findGit = function() {
	return find({
		setting: 'git-path',
		executableNames: ['git'],
		messages: {
			couldNotFindConfiguredExecutable: 'Could not find the git executable at %s, please reconfigure.',
			notFoundPrompt: 'The git executable was not found:',
			askPathPrompt: "I have Git installed outside of my PATH. Let me specify where.",
			pathPrompt: 'Path to git executable:',
			quitPrompt: "Let me install Git on my own.",
			exitMessage: 'Please install Git on your system.',
			settingSetTo: '**git path set to**: %s'
		}
	});
};

exports.findComposer = function() {
	return find({
		setting: 'composer-path',
		executableNames: ['composer', 'composer.phar'],
		// Extend findExecutable to look for composer.phar outside the path
		findExecutable() {
			var opts = this;

			// Try composer.phar in HOME
			return opts.testExecutable(path.join(homedir(), '/composer.phar'))
				.then((result) => {
					if ( result.ok ) {
						return result;
					}

					// Try composer.phar in CWD
					return opts.testExecutable(path.join(process.cwd(), '/composer.phar'))
						.then((result) => {
							// This is in a dynamic path so don't save it as a preference
							if ( result.ok ) {
								result.save = false;
							}
							return result;
						});
				})
				.then((result) => {
					if ( result.ok ) {
						return result;
					}

					// Try composer.phar in the MediaWiki installation path
					try {
						var IP = wikiRoot(process.cwd()).IP;
						return opts.testExecutable(path.join(IP, '/composer.phar'))
							.then((result) => {
								// This is in a dynamic path so don't save it as a preference
								if ( result.ok ) {
									result.save = false;
								}
								return result;
							});
					} catch ( err ) {
						if ( err.code === 'NOT_IN_MW_IP' ) {
							return {
								ok: false
							};
						} else {
							throw err;
						}
					}
				});
		},
		// Extend testExecutable to permit non-executable composer.phar files
		testExecutable(executablePath) {
			return testExecutable(executablePath)
				.catch((err) => {
					if ( err.code === 'NOTEXEC' && /\.phar$/.test(executablePath) ) {
						// If it exists and is a .phar consider it ok even if it's not executable
						// since composer is executed using PHP.
						return {
							ok: true,
							path: executablePath
						};
					} else {
						throw err;
					}
				});
		},
		/**
		 * Install composer.phar to a private directory.
		 */
		install() {
			var opts = this,
				xdgDataDir = xdg.data || path.join(homedir(), '.data'),
				dataDir = path.join(xdgDataDir, 'mediawiki-extension'),
				installer = tmp.tmpNameAsync({prefix: 'composer-installer-', postfix: '.php'}),
				setupDataDir = mkdirp(dataDir),
				pharPath = path.join(dataDir, 'composer.phar'),
				cleanPhar = fs.unlinkAsync(pharPath)
					.catch((err) => {
						if ( err.code === 'ENOENT' ) {
							return;
						} else {
							throw err;
						}
					});

			console.log('Downloading composer installer.');
			var bar = (() => {
				var pendingPattern = '  :throbber :status',
					barPattern = '  ' + chalk.bold(':status') + ' [:bar] :percent :eta ';

				function format(pattern, tokens) {
					var output = pattern;

					_.forIn(tokens, (content, token) => {
						output = output.replace(':' + token, content);
					});

					return output;
				}

				function formatBar(ratio, tokens) {
					tokens = _.merge({
						percent: Math.min(ratio * 100, 100).toFixed(0) + '%'
					}, tokens);

					var output = barPattern,
						width,
						barCharacters,
						preBarCharacters;

					_.forIn(tokens, (content, token) => {
						output = output.replace(':' + token, content);
					});

					preBarCharacters = stripAnsi(output).length;
					width = Math.max(0, clc.windowSize.width - (preBarCharacters - 4) - 1); // width - :bar - 1 (to prevent wrapping for some reason)
					barCharacters = Math.round(width * ratio);
					output = output.replace(':bar', _.chain('=').repeat(barCharacters).padRight(width).value());

					return output;
				}

				return {
					ui: new inquirer.ui.BottomBar(),
					pending(tokens) {
						this.throbberTokens = tokens;
						if ( !this.throbber ) {
							this.throbber = createThrobber((throbber) => {
								// Ignore throbber resets since we're using inquirer's BottomBar
								throbber = throbber.replace(/\u0008/g, '');
								this.ui.updateBottomBar(format(pendingPattern, _.merge({throbber: throbber}, this.throbberTokens)));
							}, 200);
							this.throbber.start();
						}
					},
					percent(percent, tokens) {
						if ( this.throbber ) {
							this.throbber.stop();
							delete this.throbber;
						}
						if ( this.ui.rl ) {
							this.ui.updateBottomBar(formatBar(percent / 100, tokens));
						}
					},
					close() {
						if ( this.throbber ) {
							this.throbber.stop();
							delete this.throbber;
						}
						if ( this.ui.rl ) {
							this.ui.close();
							console.log('\n');
						}
					}
				};
			})();

			bar.pending({status: 'Generating tempfile name...'});
			return installer
				.then(() => {
					bar.pending({status: 'Ensuring phar directory exists...'});
				})
				.return(setupDataDir)
				.then(() => {
					bar.pending({status: 'Making room for phar...'});
				})
				.return(cleanPhar)
				.return(installer)
				.then((installer) => {
					bar.pending({status: 'Sending request for installer...'});
					return new Promise((resolve, reject) => {
						request
							.get({
								url: 'https://getcomposer.org/installer',
								strictSSL: true,
								gzip: true,
								headers: {
									'User-Agent': 'MediaWiki-Extension-Command/' + pkg.version
								}
							})
							.pipe(progressStream({time: 100}))
							.on('progress', (p) => {
								bar.percent(p.percentage, {status: 'Downloading', eta: p.eta ? (p.eta.toFixed(1) + 's') : ''});
							})
							.pipe(fs.createWriteStream(installer, {
								mode: '0600',
								flags: 'wx'
							}))
							.on('error', reject)
							.on('close', () => {
								resolve(installer);
							});
					});
					// progress to show an ascii progress bar
					// then execute 
					// return pharPath
				})
				.finally(() => {
					// End the progress bar
					bar.close();
				})
				.then((installer) => {
					return exports.findPHP()
						.then((php) => {
							console.log('Running the composer installer.');
							return new Promise((resolve, reject) => {
								// Execute the installer with an explicit --install-dir= and --filename
								child_process.spawn(
									php,
									[
										installer,
										'--install-dir=' + path.dirname(pharPath),
										'--filename=' + path.basename(pharPath),
										'--ansii'
									],
									{
										stdio: 'inherit'
									})
									.on('error', reject)
									.on('close', (code) => {
										if ( code === 0 ) {
											resolve(pharPath);
										} else {
											reject(new Error("Failure while running Composer's installer."));
										}
									});
							});
						})
						// Double check the file exists and send back a result
						.then(opts.testExecutable);
				})
				.finally(() => {
					// Delete the installer file if we downloaded it
					return installer
						.then((installer) => fs.unlinkAsync(installer))
						.catch((err) => {
							// @todo Squelch errors about installer not existing
							if ( err.code === 'ENOENT' ) {
								return;
							} else {
								throw err;
							}
						});
				});
		},
		messages: {
			couldNotFindConfiguredExecutable: 'Could not find composer at %s, please reconfigure.',
			notFoundPrompt: 'Composer was not found:',
			askPathPrompt: "I have composer installed outside of my PATH. Let me specify where.",
			pathPrompt: 'Path to composer:',
			installPrompt: "Install a local copy of composer.phar for mediawiki-extension's use.",
			quitPrompt: "Let me install Composer on my own.",
			exitMessage: 'Please install Composer on your system.',
			settingFound: '**composer path found:** %s',
			settingSetTo: '**composer path set to**: %s'
		}
	});
};
