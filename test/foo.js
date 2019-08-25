'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const bunion_1 = require("bunion");
bunion_1.default.info('just saying hi.');
bunion_1.default.warn('shit hit the fan', 'part 2');
bunion_1.default.debug('boop', { yep: 'this property is on an object' }, { 'we can log': { 'nested': ["objects, also"] } });
bunion_1.default.error(new Error('foo'));
