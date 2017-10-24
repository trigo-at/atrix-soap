'use strict';

module.exports = async (req, reply, service) => {
	console.log('DADADADAD')
	reply({ greeting: `Hello Service! ${req.payload.firstName}` });

};
