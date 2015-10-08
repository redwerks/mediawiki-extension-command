"use strict";
var Promise = require('bluebird'),
	_ = require('lodash'),
	inquirer = require('inquirer');

module.exports = _.merge(Object.create(inquirer), {
	prompt(questions) {
		return new Promise((resolve) => {
			inquirer.prompt(questions, (answers) => {
				resolve(answers);
			});
		});
	}
});
