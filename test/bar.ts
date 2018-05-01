import {log, Level} from 'bunion';

log.info('crescendo');
log.warn('foo');

if(log.isEnabled(Level.DEBUG)){

}

const child = log.child().setLevel(Level.WARN).setFields({a: 'moooo'}).addField('bar', 'mar');

child.setLevel(Level.DEBUG);
child.fatal('money');

export default 'b';