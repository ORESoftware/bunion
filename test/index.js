"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Bunion = require("bunion");
const log = Bunion.createLogger({ appName: 'foo' });
log.warnx({ x: 'a' });
