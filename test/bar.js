"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bunion_1 = require("bunion");
bunion_1.log.info('crescendo');
bunion_1.log.warn('foo');
const log = bunion_1.log.child().setLevel(bunion_1.Level.WARN).setFields({ a: 'moooo' }).addField('bar', 'mar');
log.setLevel(bunion_1.Level.DEBUG);
log.fatal('money');
exports.default = 'b';
