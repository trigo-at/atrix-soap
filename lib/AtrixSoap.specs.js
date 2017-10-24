'use strict';

/* eslint-env node, mocha */
/* eslint no-unused-expressions: 0, arrow-body-style: 0 */

const { expect } = require('chai');
const atrix = require('@trigo/atrix');
const svc = require('../specs/service');
const soap = require('soap');
const fs = require('fs');

const testSVC = (config) => {
	const svc = new atrix.Service('s1', config);
	atrix.addService(svc);
	svc.endpoints.add('soap');

	return svc;
};


describe('AtrixSoap', () => {
	before(async () => {
		await svc.start();
	});

	it('starts http service with /alive endpoint', async () => {
		const res = await svc.test.get('/alive');
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
		// const xml = fs.readFileSync(`${__dirname}/../specs/hello-service.wsdl`, 'utf8');
		const client = await soap.createClientAsync(`${__dirname}/../specs/hello-service.wsdl`);
		const res = await client.sayHelloAsync({ firstName: 'Franz' });
		expect(res).to.eql({ greeting: 'Hello Service! Franz' });
		console.log(res);
	});


	it('handle error gracefully', async () => {
		// const xml = fs.readFileSync(`${__dirname}/../specs/hello-service.wsdl`, 'utf8');
		const client = await soap.createClientAsync(`${__dirname}/../specs/hello-service.wsdl`);
		const res = await client.sayErrorAsync({ firstName: 'Franz' });

		console.log(res);
	});
});
