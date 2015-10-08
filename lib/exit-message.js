"use strict";
module.exports = exitMessage;

/**
 * Exits the program with a simple message
 */
function exitMessage(message, opts) {
	console.error(message);
	process.exit(typeof opts.statusCode === 'number' ? opts.statusCode : 1);
}
