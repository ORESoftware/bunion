"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
debugger;
const bunion_1 = require("bunion");
bunion_1.log.warn('foo');
const child = bunion_1.log.child().setLevel(bunion_1.Level.INFO);
child.debug('money');
exports.default = 'b';
