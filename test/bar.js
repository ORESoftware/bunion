"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bunion_1 = require("bunion");
bunion_1.log.info('crescendo');
bunion_1.log.warn('foo');
if (bunion_1.log.isEnabled(bunion_1.Level.DEBUG)) {
}
const child = bunion_1.log.child().setLevel(bunion_1.Level.WARN).setFields({ a: 'moooo' }).addField('bar', 'mar');
child.setLevel(bunion_1.Level.DEBUG);
child.fatal('money');
exports.default = 'b';
