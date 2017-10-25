
const pkg = require('../package.json');

const AtrixSoap = require('./AtrixSoap');

module.exports = {
	name: pkg.name,
	version: pkg.version,
	register: () => {},
	factory: (atrix, service, config) => new AtrixSoap(atrix, service, config),
};