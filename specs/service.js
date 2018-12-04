'use strict';

const atrix = require('@trigo/atrix');
const path = require('path');
const supertest = require('supertest');

atrix.configure({ pluginMap: { soap: path.join(__dirname, '../') } });

const services = [];
services.push(atrix.addService({
	name: 'svc1',
	endpoints: {
		soap: {
			port: 3028,
			wsdl: `${__dirname}/hello-service.wsdl`,
			handlerDir: `${__dirname}/handlers`,
			path: '/hello-service',
		},
	},
}));

services.push(atrix.addService({
	name: 'withAuth',
	endpoints: {
		soap: {
			port: 3029,
			wsdl: `${__dirname}/hello-service-withauth.wsdl`,
			handlerDir: `${__dirname}/handlers`,
			path: '/hello-service',
			connectionAuth: () => {
				module.exports.authCallbackHit = true;
				const authWorks = !module.exports.letConnectionAuthFail;
				return authWorks;
			},
		},
	},
}));
services.push(atrix.addService({
	name: 'withAuthBasic',
	endpoints: {
		soap: {
			port: 3030,
			wsdl: `${__dirname}/hello-service-withauth-basic.wsdl`,
			handlerDir: `${__dirname}/handlers`,
			path: '/hello-service',
			connectionAuth: {
				basicAuth: {
					username: 'franz',
					password: 'supa!',
				},
			},
		},
	},
}));
const svcs = {};

Object.keys(atrix.services).forEach((serviceName) => {
	const s = atrix.services[serviceName];
	if (s.config.config.endpoints.soap) {
		svcs[s.name] = supertest(`http://localhost:${s.config.config.endpoints.soap.port}`);
	}
});

module.exports = {
	services,
	start: async () => {
		for (const svc of services) {
			await svc.start();
		}
	},
	sts: svcs,
	authCallbackHit: false,
	letConnectionAuthFail: false,
};
