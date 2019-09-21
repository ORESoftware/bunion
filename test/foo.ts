'use strict';

import log from 'bunion';
log.info('just saying hi.');
log.warn('shit hit the fan', 'part 2');
log.debug('boop', {yep:'this property is on an object'}, {'we can log': {'nested':["objects, also"]}});

log.error(new Error('foo'));

