'use strict';

const express = require('express');
const bb = require('bluebird');
const Joi = require('joi');
const fs = require('fs');
const soap = require('soap');
const walk = require('./walk');

const configSchema = Joi.object({
	port: Joi.number().integer().min(1).max(65535)
		.default(3000)
		.description('the port the server should bind'),
	wsdl: Joi.string().required()
		.description('local path to the WSDL file to use'),
	handlerDir: Joi.string().required()
		.description('local path to the directory containing the service handlers'),
	path: Joi.string().required()
		.description('path to which is searved from soap server'),
});

class AtrixSoap {
	constructor(atrix, service, config) {
		this.retries = {};
		this.atrix = atrix;
		this.service = service;
		this.log = this.service.log.child({ plugin: 'AtrixSoap' });
		this.config = Joi.attempt(config, configSchema);
		this.app = express();
		bb.promisifyAll(this.app);
	}


	async start() {
		console.log('SYTAR');

		const xml = fs.readFileSync(this.config.wsdl, 'utf8');
		const service = this.resolveService();

		await this.app.listenAsync(this.config.port);
		this.log.info(`Server listening on: ${this.config.port}`);
		console.log(service);
		soap.listen(this.app, this.config.path, service, xml);

		this.log.debug('start');
	}

	resolveService() {
		const files = walk(this.config.handlerDir);
		console.log(files);

		const svc = {};

		files.filter(f => f.indexOf('.specs.js') === -1).forEach((f) => {
			const sp = f.replace(/^/g, '/').split('/');
			const service = sp[sp.length - 3];
			const port = sp[sp.length - 2];
			const method = sp[sp.length - 1].replace('.js', '');
			if (!svc[service]) svc[service] = {};
			if (!svc[service][port]) svc[service][port] = {};

			const handlerFn = require(f); //eslint-disable-line

			svc[service][port][method] = (args, callback, headers, req) => {
				const request = {
					path: `${this.config.path}/${service}/${port}/${method}`,
					payload: args,
					soapHeaders: headers,
					raw: { req },
				};

				let result;
				handlerFn(request, res => { result = res; }, this.service)
					.then(() => {
						callback(result);
					}).catch(e => {
						callback({ Fault: e });
					});
			};
			console.log(`${service}.${port}.${method}`);
		});


		return svc;
	}

	// just stub method to
	registerHandler(method, path) {
		if (method === 'GET' && path === '/alive') {
			this.app.get(path, (req, res) => {
				res.send({ status: 200, description: 'OK' });
			});
		} else {
			throw new Error(`Invaalid handler registration: ${method} ${path}`);
		}
	}
}


module.exports = AtrixSoap;
