'use strict';

const express = require('express');
const bb = require('bluebird');
const Joi = require('joi');
const fs = require('fs');
const soap = require('soap');
const walk = require('./walk');
const basicAuth = require('basic-auth');

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
	connectionAuth: Joi.alternatives().try([
		Joi.func().description('function with signature (req) => { return true/false; } to check connection auth. e.g. Basi Auth'),
		Joi.object({
			basicAuth: Joi.object({
				username: Joi.string().description('username to match'),
				password: Joi.string().description('password to match'),
				// authenticate: Joi.func().description('function with signature (username, password) => boolean to check authentication'),
			}).description('setup basic auth support'),
		})]),
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
		this.log.debug('Starting SOAP Endpoint...');
		const xml = fs.readFileSync(this.config.wsdl, 'utf8');
		const service = this.resolveService();

		await this.app.listenAsync(this.config.port);
		const server = soap.listen(this.app, this.config.path, service, xml);
		server.log = (type, data) => {
			this.log.debug(`${type}\n${data}`);
		};

		if (this.config.connectionAuth) {
			if (typeof this.config.connectionAuth === 'function') {
				server.authorizeConnection = this.config.connectionAuth;
			} else if (typeof this.config.connectionAuth === 'object') {
				server.authorizeConnection = (req) => {
					const credential = basicAuth(req);
					if (!credential) return false;
					return credential.name === this.config.connectionAuth.basicAuth.username && credential.pass === this.config.connectionAuth.basicAuth.password;
				};
			}
		}

		this.log.info(`SOAP Server listening on: ${this.config.port} path: ${this.config.path}`);
	}

	resolveService() {
		const files = walk(this.config.handlerDir);
		// console.log(files);

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
				handlerFn(request, (res) => { result = res; }, this.service)
					.then(() => {
						callback(result);
					}).catch((e) => {
						this.log.error(e);
						// TODO: Make it return error data
						callback({
							Fault: {
								Code: {
									Value: 'soap:Sender',
									Subcode: { value: e.message },
								},
								Reason: { Text: e.message },
								statusCode: 500,
							},
						});
					});
			};
			// console.log(`${service}.${port}.${method}`);
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
