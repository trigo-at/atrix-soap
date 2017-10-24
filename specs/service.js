'use strict';

const atrix = require('@trigo/atrix');
const path = require('path');
const supertest = require('supertest');

atrix.configure({ pluginMap: { soap: path.join(__dirname, '../') } });

const svc = new atrix.Service('s1', {
	endpoints: {
		soap: {
			port: 3028,
			wsdl: `${__dirname}/hello-service.wsdl`,
			handlerDir: `${__dirname}/handlers`,
			path: '/hello-service',
		},
	},
});

atrix.addService(svc);
svc.endpoints.add('soap');

const svcs = {};

Object.keys(atrix.services).forEach((serviceName) => {
	const s = atrix.services[serviceName];
	if (s.config.config.endpoints.soap) {
		svcs[s.name] = supertest(`http://localhost:${svc.config.config.endpoints.soap.port}`);
	}
});

module.exports = {
	service: svc,
	start: async () => svc.start(),
	test: svcs[svc.name],
};
