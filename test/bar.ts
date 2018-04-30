
import {log, Level} from 'bunion';

console.log('debug level is:',Level.DEBUG, typeof Level.DEBUG);

log.info('crescendo');
log.warn('foo');

const child = log.child().setLevel(Level.WARN).setFields({a: 'moooo'}).addField('bar', 'mar');

child.setLevel('ERROR');
child.error('money');

export default 'b';