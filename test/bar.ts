import {log as parent, Level} from 'bunion';

parent.info('crescendo');
parent.warn('foo');


const log = parent.child().setLevel(Level.WARN).setFields({a: 'moooo'}).addField('bar', 'mar');

log.setLevel(Level.DEBUG);
log.fatal('money');

export default 'b';