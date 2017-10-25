'use strict';

module.exports = async (req, reply, service) => {
	module.exports.service = service;
	reply({ greeting: `Hello Service! ${req.payload.firstName}` });
};
