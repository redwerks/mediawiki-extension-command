#!/usr/bin/env node
"use strict";
process.bin = process.title = 'mediawiki-extension';
var Promise = require('bluebird');
Promise.longStackTraces();
require('babel/register')();

var pkg = require('../package.json'),
	updateNotifier = require('update-notifier'),
	commands = require('../lib/commands');

// Notify the user of any available updates
updateNotifier({pkg: pkg}).notify();

// Run our commands
commands.nom();
