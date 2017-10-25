'use strict';

/* eslint-env node, mocha */
/* eslint no-unused-expressions: 0, arrow-body-style: 0 */

const { expect } = require('chai');
const atrix = require('@trigo/atrix');
const svc = require('../specs/service');
const soap = require('soap');

const testSVC = (config) => {
	const s = new atrix.Service('s1', config);
	atrix.addService(s);
	s.endpoints.add('soap');
	return s;
};


describe('AtrixSoap', () => {
	before(async () => {
		await svc.start();
	});

	it('starts http service with /alive endpoint', async () => {
		const res = await svc.sts.s1.get('/alive');
		expect(res.statusCode).to.equal(200);
		expect(res.body).to.eql({ status: 200, description: 'OK' });
	});

	it('start fails when wsdl file not found', async () => {
		try {
			await testSVC({
				endpoints: {
					soap: {
						port: 9999,
						wsdl: `${__dirname}/hellosdfas-service.wsdl`,
					},
				},
			}).start();
		} catch (e) {
			return;
		}

		throw new Error('Should have failed');
	});

	it('can make SOAP call', async () => {
		const client = await soap.createClientAsync(`${__dirname}/../specs/hello-service.wsdl`);
		const res = await client.sayHelloAsync({ firstName: 'Franz' });
		expect(res).to.eql({ greeting: 'Hello Service! Franz' });
	});


	it('handle error gracefully', async () => {
		const client = await soap.createClientAsync(`${__dirname}/../specs/hello-service.wsdl`);
		try {
			await client.sayErrorAsync({ firstName: 'Franz' });
		} catch (e) {
			return;
		}
		throw new Error('This should have failed');
	});

	it('passes service instance to handler', async () => {
		const h = require('../specs/handlers/Hello_Service/Hello_Port/sayHello'); //eslint-disable-line
		const client = await soap.createClientAsync(`${__dirname}/../specs/hello-service.wsdl`);
		await client.sayHelloAsync({ firstName: 'Franz' });
		expect(h.service).to.equal(svc.services[0]);
	});


	describe('connectionAuth', () => {
		it('can authenticate using connectionAuth function', async () => {
			const client = await soap.createClientAsync(`${__dirname}/../specs/hello-service-withauth.wsdl`);

			svc.letConnectionAuthFail = false;
			const res = await client.sayHelloAsync({ firstName: 'Franz' });
			expect(res).to.eql({ greeting: 'Hello Service! Franz' });
			expect(svc.authCallbackHit).to.be.true;
		});

		it('fails when connectionAuth function returns false', async () => {
			const client = await soap.createClientAsync(`${__dirname}/../specs/hello-service-withauth.wsdl`);
			svc.letConnectionAuthFail = true;

			try {
				await client.sayHelloAsync({ firstName: 'Franz' });
			} catch (e) {
				return;
			}
			throw new Error('this should have failed');
		});

		it('can authenticate wusing connectionAuth.basicAuth: { username: ...,  password: ... }', async () => {
			const client = await soap.createClientAsync(`${__dirname}/../specs/hello-service-withauth-basic.wsdl`);
			client.setSecurity(new soap.BasicAuthSecurity('franz', 'supa!'));
			const res = await client.sayHelloAsync({ firstName: 'Franz' });
			expect(res).to.eql({ greeting: 'Hello Service! Franz' });
		});
		it('can authenticate wusing connectionAuth.basicAuth: { username: ...,  password: ... } - missing auth header', async () => {
			const client = await soap.createClientAsync(`${__dirname}/../specs/hello-service-withauth-basic.wsdl`);
			try {
				await client.sayHelloAsync({ firstName: 'Franz' });
			} catch (e) {
				return;
			}
			throw new Error('this should have failed');
		});
		it('can authenticate wusing connectionAuth.basicAuth: { username: ...,  password: ... } - failure', async () => {
			const client = await soap.createClientAsync(`${__dirname}/../specs/hello-service-withauth-basic.wsdl`);
			client.setSecurity(new soap.BasicAuthSecurity('franz', 'nicht supa!'));
			try {
				await client.sayHelloAsync({ firstName: 'Franz' });
			} catch (e) {
				return;
			}
			throw new Error('this should have failed');
		});
	});
});