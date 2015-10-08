"use strict";
var _ = require('lodash'),
	conf = require('./configstore'),
	request = require('./request'),
	error = require('./util/error'),
	apibase = () => conf.get('api-base') || 'https://tools.wmflabs.org/extensionservice/api/';

_.each(['get', 'post'], (name) => {
	exports[name] = function(apiMethod) {
		return request[`${name}Async`](
			{
				baseUrl: apibase(),
				json: true,
				url: apiMethod
			})
			.spread((res, body) => {
				if ( typeof body === 'object' && typeof body.error === 'object' ) {
					throw _.merge(new Error(body.error.message),
						{
							...body.error,
							status: res.status
						});
				} else if ( res.statusCode === 200 ) {
					return body;
				} else {
					throw new Error(body);
				}
			})
			.catch((err) => {
				if ( err.code === 'ECONNREFUSED' ) {
					error(`Could not connect to the API at ${apibase()}.`, 'API:NO_CONNECTION');
				}

				throw err;
			});
	};
})
